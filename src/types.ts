// The unified item entity. One table, not separate Task/Note tables —
// the task<->note toggle is just flipping `type`.

export type ItemType = 'task' | 'note'
export type Priority = 'low' | 'medium' | 'high'
export type ItemStatus = 'open' | 'done'
export type CaptureSource = 'text' | 'voice'

export interface Item {
  id: string
  userId: string // stamped now even in single-user v1 (multi-user foresight)
  rawText: string // the original dump — ALWAYS preserved, never overwritten
  type: ItemType
  title: string | null // optional; can be AI-suggested
  body: string | null // note content
  folderId: string | null // NOTES only — a note's single home folder
  tags: string[] // cross-cutting, all items
  priority: Priority | null
  dueDate: number | null // timestamp, parsed from natural language
  recurrence: null // RESERVED — recurring tasks slot in after v1
  status: ItemStatus // for tasks
  triaged: boolean // false = still in Inbox; drives the triage loop
  aiClassified: boolean // true if AI set the suggestions (vs human)
  embedding: null // RESERVED — semantic search fast-follow
  source: CaptureSource
  createdAt: number
  updatedAt: number
}

export interface Folder {
  // NOTES only
  id: string
  userId: string
  name: string
  createdAt: number
}

// Predefined, extensible tag set. Users extend it simply by typing new
// tags on any item; the effective tag set = defaults ∪ tags in use.
export const DEFAULT_TAGS = ['personal', 'office work', 'ideas', 'content']

export const DEFAULT_FOLDERS = ['Personal', 'Work', 'Content']
