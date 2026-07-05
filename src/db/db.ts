import Dexie, { type EntityTable } from 'dexie'
import type { Item, Folder } from '../types'

// Dexie schema. Nothing outside src/db/ may import this — the UI talks
// to the repository interface only, so swapping in an API-backed store
// later touches one directory.

export const db = new Dexie('braindump') as Dexie & {
  items: EntityTable<Item, 'id'>
  folders: EntityTable<Folder, 'id'>
}

db.version(1).stores({
  items: 'id, userId, type, triaged, status, dueDate, folderId, createdAt, updatedAt, *tags',
  folders: 'id, userId, name, createdAt',
})
