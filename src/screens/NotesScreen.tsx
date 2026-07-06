import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Item } from '../types'
import ItemCard from '../components/ItemCard'
import ItemEditor from '../components/ItemEditor'
import { allTags } from '../utils/items'

export default function NotesScreen() {
  const items = useStore((s) => s.items)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)

  const notes = useMemo(
    () =>
      items
        .filter(
          (i) => i.type === 'note' && i.triaged && (!tagFilter || i.tags.includes(tagFilter)),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [items, tagFilter],
  )

  const tags = allTags(items)

  return (
    <div>
      <div className="chip-row scroll">
        <button className={`chip ${tagFilter === null ? 'on' : ''}`} onClick={() => setTagFilter(null)}>
          All
        </button>
        {tags.map((t) => (
          <button
            key={t}
            className={`chip ${tagFilter === t ? 'on' : ''}`}
            onClick={() => setTagFilter(tagFilter === t ? null : t)}
          >
            #{t}
          </button>
        ))}
      </div>

      {notes.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">📝</span>
          No notes yet. Dump a thought on the Capture tab —<br />
          reference material lands here once triaged.
        </div>
      ) : (
        notes.map((note) => <ItemCard key={note.id} item={note} onOpen={setEditing} />)
      )}

      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
