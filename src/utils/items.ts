import type { Item } from '../types'
import { DEFAULT_TAGS } from '../types'

/** what to show as an item's one-line heading */
export function displayTitle(item: Item): string {
  if (item.title) return item.title
  const firstLine = item.rawText.split('\n')[0].trim()
  return firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

/** sort: open before done, then priority, then soonest due date */
export function byPriority(a: Item, b: Item): number {
  const pa = a.priority ? PRIORITY_RANK[a.priority] : 3
  const pb = b.priority ? PRIORITY_RANK[b.priority] : 3
  if (pa !== pb) return pa - pb
  return (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity)
}

/** effective tag universe: predefined set ∪ every tag in use */
export function allTags(items: Item[]): string[] {
  const tags = new Set(DEFAULT_TAGS)
  for (const item of items) for (const t of item.tags) tags.add(t)
  return [...tags].sort()
}
