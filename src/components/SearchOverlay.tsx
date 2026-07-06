import { useEffect, useRef, useState } from 'react'
import type { Item } from '../types'
import { searchService } from '../services/search'
import ItemCard from './ItemCard'
import ItemEditor from './ItemEditor'
import { useStore } from '../store/useStore'

interface Props {
  onClose(): void
}

export default function SearchOverlay({ onClose }: Props) {
  const items = useStore((s) => s.items) // re-run search when data changes
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Item[]>([])
  const [editing, setEditing] = useState<Item | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    void searchService.search(query).then((r) => {
      if (!cancelled) setResults(r)
    })
    return () => {
      cancelled = true
    }
  }, [query, items])

  return (
    <div className="search-overlay">
      <div className="search-head">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything…"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
          }}
        />
        <button className="iconbtn" aria-label="Close search" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="search-results">
        {query.trim() && results.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">🔍</span>
            Nothing matches “{query}”.
          </div>
        ) : (
          results.map((item) => (
            <ItemCard key={item.id} item={item} onOpen={setEditing} showType />
          ))
        )}
      </div>
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
