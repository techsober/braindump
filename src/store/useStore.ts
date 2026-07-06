import { create } from 'zustand'
import { repository } from '../db/dexieRepository'
import type { NewCapture } from '../db/repository'
import type { Item, Folder } from '../types'
import { DEFAULT_FOLDERS } from '../types'
import { classifier } from '../services/classify'
import { allTags } from '../utils/items'

interface Store {
  items: Item[]
  folders: Folder[]
  loaded: boolean
  /** ids currently awaiting an AI classification response */
  classifying: Set<string>

  load(): Promise<void>

  /**
   * THE capture path — the one non-negotiable lives here.
   * The dump is written to local storage and this promise resolves with
   * no network involved. AI classification (wired in later stages) runs
   * detached AFTER the save; its failure can never affect the capture.
   */
  capture(c: NewCapture): Promise<Item>

  updateItem(id: string, patch: Partial<Item>): Promise<void>
  deleteItem(id: string): Promise<void>
  /** confirm an inbox item as-is (or with edits) — exits the Inbox */
  triageItem(id: string, patch?: Partial<Item>): Promise<void>
  toggleDone(id: string): Promise<void>

  createFolder(name: string): Promise<Folder>
  renameFolder(id: string, name: string): Promise<void>
  deleteFolder(id: string): Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  items: [],
  folders: [],
  loaded: false,
  classifying: new Set<string>(),

  async load() {
    let folders = await repository.getAllFolders()
    if (folders.length === 0) {
      // first run: seed the default note folders
      for (const name of DEFAULT_FOLDERS) await repository.createFolder(name)
      folders = await repository.getAllFolders()
    }
    const items = await repository.getAllItems()
    set({ items, folders, loaded: true })
  },

  async capture(c) {
    // 1. Save locally, instantly. This await is IndexedDB only — no
    //    network, no AI. If everything else fails, the dump is safe.
    const item = await repository.createItem(c)
    set((s) => ({ items: [item, ...s.items] }))

    // 2. AI classification happens detached, after the fact, on top of
    //    an already-saved item. Note: not awaited by the capture path.
    void afterCapture(item, c.type != null, set, get)

    return item
  },

  async updateItem(id, patch) {
    await repository.updateItem(id, patch)
    await refreshItems(set)
  },

  async deleteItem(id) {
    await repository.deleteItem(id)
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  async triageItem(id, patch = {}) {
    await repository.updateItem(id, { ...patch, triaged: true })
    await refreshItems(set)
  },

  async toggleDone(id) {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    await repository.updateItem(id, { status: item.status === 'done' ? 'open' : 'done' })
    await refreshItems(set)
  },

  async createFolder(name) {
    const folder = await repository.createFolder(name)
    set((s) => ({ folders: [...s.folders, folder] }))
    return folder
  },

  async renameFolder(id, name) {
    await repository.renameFolder(id, name)
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) }))
  },

  async deleteFolder(id) {
    await repository.deleteFolder(id)
    const [items, folders] = await Promise.all([
      repository.getAllItems(),
      repository.getAllFolders(),
    ])
    set({ items, folders })
  },
}))

async function refreshItems(set: (p: Partial<Store>) => void) {
  set({ items: await repository.getAllItems() })
}

type SetState = {
  (partial: Partial<Store>): void
  (fn: (s: Store) => Partial<Store>): void
}

/**
 * Post-capture enhancement hook. The capture is already persisted when
 * this runs; nothing here may throw into, block, or gate the capture
 * path. Offline, no API key, a dead API, or malformed output all end
 * the same way: the item simply waits in the Inbox untriaged.
 */
async function afterCapture(
  item: Item,
  userSetType: boolean,
  set: SetState,
  get: () => Store,
): Promise<void> {
  if (!classifier.available()) return

  set((s) => ({ classifying: new Set(s.classifying).add(item.id) }))
  try {
    const suggestion = await classifier.classify(item.rawText, allTags(get().items))

    // Re-check the live item: if the user already triaged, edited, or
    // deleted it while the API call was in flight, the human wins.
    const live = await repository.getItem(item.id)
    if (!live || live.triaged || live.updatedAt !== item.updatedAt) return

    const type = userSetType ? live.type : suggestion.type
    await repository.updateItem(item.id, {
      type,
      title: suggestion.title,
      body: type === 'note' ? (suggestion.body ?? live.rawText) : suggestion.body,
      tags: suggestion.tags,
      priority: type === 'task' ? suggestion.priority : null,
      dueDate: type === 'task' ? suggestion.dueDate : null,
      aiClassified: true,
    })
  } catch {
    // Swallowed by design: AI is an enhancement, never a gate.
  } finally {
    set((s) => {
      const classifying = new Set(s.classifying)
      classifying.delete(item.id)
      return { classifying }
    })
    await refreshItems(set)
  }
}
