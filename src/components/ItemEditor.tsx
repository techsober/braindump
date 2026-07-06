import { useState } from 'react'
import type { Item, ItemType, Priority } from '../types'
import { useStore } from '../store/useStore'
import { allTags } from '../utils/items'
import { toDateInput, fromDateInput } from '../utils/dates'

interface Props {
  item: Item
  onClose(): void
}

/**
 * Bottom-sheet editor used everywhere an item can be opened (Inbox,
 * Tasks, Notes, Search). Saving counts as human triage: the item leaves
 * the Inbox (triaged: true) and the human's choices override the AI's.
 */
export default function ItemEditor({ item, onClose }: Props) {
  const items = useStore((s) => s.items)
  const folders = useStore((s) => s.folders)
  const triageItem = useStore((s) => s.triageItem)
  const deleteItem = useStore((s) => s.deleteItem)

  const [type, setType] = useState<ItemType>(item.type)
  const [title, setTitle] = useState(item.title ?? '')
  const [body, setBody] = useState(item.body ?? item.rawText)
  const [folderId, setFolderId] = useState(item.folderId ?? '')
  const [tags, setTags] = useState<string[]>(item.tags)
  const [newTag, setNewTag] = useState('')
  const [priority, setPriority] = useState<Priority | ''>(item.priority ?? '')
  const [due, setDue] = useState(toDateInput(item.dueDate))

  const knownTags = allTags(items)

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function addNewTag() {
    const tag = newTag.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setNewTag('')
  }

  async function save() {
    await triageItem(item.id, {
      type,
      title: title.trim() || null,
      body: type === 'note' ? body : body.trim() || null,
      folderId: type === 'note' && folderId ? folderId : null,
      tags,
      priority: priority || null,
      dueDate: fromDateInput(due),
      aiClassified: false, // a human made these choices
    })
    onClose()
  }

  async function remove() {
    await deleteItem(item.id)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />

        <div className="field">
          <label>Type</label>
          <div className="seg">
            {(['task', 'note'] as const).map((t) => (
              <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>
                {t === 'task' ? '☑ Task' : '📝 Note'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title"
          />
        </div>

        <div className="field">
          <label>{type === 'note' ? 'Note' : 'Details'}</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        {type === 'note' && (
          <div className="field">
            <label>Folder</label>
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'task' && (
          <>
            <div className="field">
              <label>Priority</label>
              <div className="seg">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    className={priority === p ? 'on' : ''}
                    onClick={() => setPriority(priority === p ? '' : p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Due date</label>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          </>
        )}

        <div className="field">
          <label>Tags</label>
          <div className="chip-row">
            {knownTags.map((t) => (
              <button
                key={t}
                className={`chip ${tags.includes(t) ? 'on' : ''}`}
                onClick={() => toggleTag(t)}
              >
                #{t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addNewTag()
              }
            }}
            onBlur={addNewTag}
            placeholder="Add a tag…"
          />
        </div>

        <div className="field">
          <label>Original dump</label>
          <div className="raw">{item.rawText}</div>
        </div>

        <div className="sheet-actions">
          <button className="danger" onClick={() => void remove()}>
            Delete
          </button>
          <button className="primary" onClick={() => void save()}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
