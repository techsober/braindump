// Search behind a service interface. v1 is plain full-text over
// rawText/title/body; the reserved `embedding` field on Item is where
// a semantic implementation plugs in later — swapping this class out
// requires zero UI changes.

import type { Item } from '../types'
import { repository } from '../db/dexieRepository'

export interface SearchService {
  search(query: string): Promise<Item[]>
}

class FullTextSearch implements SearchService {
  async search(query: string): Promise<Item[]> {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []
    const items = await repository.getAllItems()
    return items
      .map((item) => ({ item, score: score(item, terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt)
      .map((r) => r.item)
  }
}

function score(item: Item, terms: string[]): number {
  const title = (item.title ?? '').toLowerCase()
  const raw = item.rawText.toLowerCase()
  const body = (item.body ?? '').toLowerCase()
  const tags = item.tags.join(' ').toLowerCase()
  let total = 0
  for (const term of terms) {
    // every term must appear somewhere (AND semantics)
    const hit =
      (title.includes(term) ? 3 : 0) +
      (tags.includes(term) ? 2 : 0) +
      (raw.includes(term) ? 1 : 0) +
      (body.includes(term) ? 1 : 0)
    if (hit === 0) return 0
    total += hit
  }
  return total
}

export const searchService: SearchService = new FullTextSearch()
