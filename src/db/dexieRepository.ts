import { db } from './db'
import { currentUserId } from '../identity'
import type { Item, Folder } from '../types'
import type { Repository, NewCapture } from './repository'

class DexieRepository implements Repository {
  async createItem(capture: NewCapture): Promise<Item> {
    const now = Date.now()
    const item: Item = {
      id: crypto.randomUUID(),
      userId: currentUserId(),
      rawText: capture.rawText,
      type: capture.type ?? 'note',
      title: null,
      body: null,
      folderId: null,
      tags: [],
      priority: null,
      dueDate: null,
      recurrence: null,
      status: 'open',
      triaged: false,
      aiClassified: false,
      embedding: null,
      source: capture.source,
      createdAt: now,
      updatedAt: now,
    }
    await db.items.add(item)
    return item
  }

  async updateItem(id: string, patch: Partial<Item>): Promise<Item | undefined> {
    // rawText is the original dump: never overwritten, even by edits.
    const { rawText: _ignored, id: _id, createdAt: _c, ...safe } = patch
    await db.items.update(id, { ...safe, updatedAt: Date.now() })
    return db.items.get(id)
  }

  async deleteItem(id: string): Promise<void> {
    await db.items.delete(id)
  }

  getItem(id: string): Promise<Item | undefined> {
    return db.items.get(id)
  }

  getAllItems(): Promise<Item[]> {
    return db.items.orderBy('createdAt').reverse().toArray()
  }

  async createFolder(name: string): Promise<Folder> {
    const folder: Folder = {
      id: crypto.randomUUID(),
      userId: currentUserId(),
      name,
      createdAt: Date.now(),
    }
    await db.folders.add(folder)
    return folder
  }

  async renameFolder(id: string, name: string): Promise<void> {
    await db.folders.update(id, { name })
  }

  async deleteFolder(id: string): Promise<void> {
    // Notes in a deleted folder fall back to "no folder", never deleted.
    await db.transaction('rw', db.items, db.folders, async () => {
      await db.items.where('folderId').equals(id).modify({ folderId: null })
      await db.folders.delete(id)
    })
  }

  getAllFolders(): Promise<Folder[]> {
    return db.folders.orderBy('createdAt').toArray()
  }
}

export const repository: Repository = new DexieRepository()
