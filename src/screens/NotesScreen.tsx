import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Item } from '../types'
import ItemCard from '../components/ItemCard'
import ItemEditor from '../components/ItemEditor'
import { allTags } from '../utils/items'

type View = 'folders' | 'recent' | 'tags'

export default function NotesScreen() {
  const items = useStore((s) => s.items)
  const folders = useStore((s) => s.folders)
  const createFolder = useStore((s) => s.createFolder)
  const renameFolder = useStore((s) => s.renameFolder)
  const deleteFolder = useStore((s) => s.deleteFolder)

  const [view, setView] = useState<View>('folders')
  const [openFolder, setOpenFolder] = useState<string | null>(null) // '' = no-folder group
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)

  const notes = useMemo(
    () =>
      items
        .filter((i) => i.type === 'note' && i.triaged)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [items],
  )

  const tags = allTags(items)

  function countIn(folderId: string | null): number {
    return notes.filter((n) => (n.folderId ?? null) === folderId).length
  }

  async function onNewFolder() {
    const name = prompt('Folder name')?.trim()
    if (name) await createFolder(name)
  }

  async function onRenameFolder(id: string, current: string) {
    const name = prompt('Rename folder', current)?.trim()
    if (name && name !== current) await renameFolder(id, name)
  }

  async function onDeleteFolder(id: string, name: string) {
    if (confirm(`Delete folder “${name}”? Its notes are kept and moved to “No folder”.`)) {
      await deleteFolder(id)
      setOpenFolder(null)
    }
  }

  // --- inside a folder ---
  if (view === 'folders' && openFolder !== null) {
    const folder = folders.find((f) => f.id === openFolder)
    const inFolder = notes.filter((n) => (n.folderId ?? '') === openFolder)
    return (
      <div>
        <button className="backlink" onClick={() => setOpenFolder(null)}>
          ‹ Folders
        </button>
        <h2 className="section-title">
          📁 {folder ? folder.name : 'No folder'} <span className="count">{inFolder.length}</span>
          {folder && (
            <>
              <span style={{ flex: 1 }} />
              <button className="chip" onClick={() => void onRenameFolder(folder.id, folder.name)}>
                Rename
              </button>
              <button className="chip" onClick={() => void onDeleteFolder(folder.id, folder.name)}>
                Delete
              </button>
            </>
          )}
        </h2>
        {inFolder.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">📁</span>
            Nothing in here yet.
          </div>
        ) : (
          inFolder.map((n) => <ItemCard key={n.id} item={n} onOpen={setEditing} />)
        )}
        {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
      </div>
    )
  }

  const filtered =
    view === 'tags' && tagFilter ? notes.filter((n) => n.tags.includes(tagFilter)) : notes

  return (
    <div>
      <div className="chip-row scroll">
        {(
          [
            ['folders', '📁 Folders'],
            ['recent', '🕐 Recent'],
            ['tags', '# Tags'],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            className={`chip ${view === v ? 'on' : ''}`}
            onClick={() => {
              setView(v)
              setOpenFolder(null)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'folders' && (
        <div>
          {folders.map((f) => (
            <button
              key={f.id}
              className="folder-row"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => setOpenFolder(f.id)}
            >
              📁 {f.name} <span className="count">{countIn(f.id)}</span>
            </button>
          ))}
          {countIn(null) > 0 && (
            <button
              className="folder-row"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => setOpenFolder('')}
            >
              🗂 No folder <span className="count">{countIn(null)}</span>
            </button>
          )}
          <button className="btn" onClick={() => void onNewFolder()}>
            + New folder
          </button>
        </div>
      )}

      {view === 'tags' && (
        <div className="chip-row">
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
      )}

      {view !== 'folders' &&
        (filtered.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">📝</span>
            {view === 'tags' && !tagFilter
              ? 'Pick a tag to see its notes.'
              : 'No notes here yet. Dump a thought on the Capture tab.'}
          </div>
        ) : (
          filtered.map((n) => <ItemCard key={n.id} item={n} onOpen={setEditing} />)
        ))}

      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
