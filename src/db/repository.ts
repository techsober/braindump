import type { Item, Folder, CaptureSource, ItemType } from '../types'

// Storage abstraction. Today the implementation is IndexedDB (Dexie);
// later it can become API-backed sync without the UI changing. The UI
// and services depend on this interface, never on Dexie.

export interface NewCapture {
  rawText: string
  source: CaptureSource
  /** explicit user choice at capture time; omit to let triage/AI decide */
  type?: ItemType
}

export interface Repository {
  // items
  createItem(capture: NewCapture): Promise<Item>
  updateItem(id: string, patch: Partial<Item>): Promise<Item | undefined>
  deleteItem(id: string): Promise<void>
  getItem(id: string): Promise<Item | undefined>
  getAllItems(): Promise<Item[]>

  // folders
  createFolder(name: string): Promise<Folder>
  renameFolder(id: string, name: string): Promise<void>
  deleteFolder(id: string): Promise<void>
  getAllFolders(): Promise<Folder[]>
}
