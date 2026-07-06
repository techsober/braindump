import type { Item } from '../types'
import { useStore } from '../store/useStore'
import { displayTitle } from '../utils/items'
import { formatDue } from '../utils/dates'

interface Props {
  item: Item
  onOpen(item: Item): void
  /** show the task/note chip (used where lists mix types) */
  showType?: boolean
}

export default function ItemCard({ item, onOpen, showType }: Props) {
  const toggleDone = useStore((s) => s.toggleDone)
  const folders = useStore((s) => s.folders)
  const folder = item.type === 'note' && item.folderId
    ? folders.find((f) => f.id === item.folderId)
    : undefined
  const done = item.status === 'done'
  const overdue = item.dueDate != null && item.dueDate < Date.now() && !done

  return (
    <div className="card" onClick={() => onOpen(item)}>
      <div className="card-main">
        {item.type === 'task' && (
          <button
            className={`checkbox ${done ? 'checked' : ''}`}
            aria-label={done ? 'Mark not done' : 'Mark done'}
            onClick={(e) => {
              e.stopPropagation()
              void toggleDone(item.id)
            }}
          >
            ✓
          </button>
        )}
        <div className="card-text">
          <div className={`card-title ${done ? 'done' : ''}`}>{displayTitle(item)}</div>
          {item.type === 'note' && item.body && item.body !== displayTitle(item) && (
            <div className="card-sub">{item.body}</div>
          )}
          {(showType ||
            folder ||
            item.tags.length > 0 ||
            item.priority ||
            item.dueDate != null) && (
            <div className="card-meta">
              {showType && (
                <span className={`chip type-${item.type}`}>
                  {item.type === 'task' ? '☑ task' : '📝 note'}
                </span>
              )}
              {item.dueDate != null && (
                <span className={`chip due ${overdue ? 'overdue' : ''}`}>
                  {overdue ? '⚠ ' : '📅 '}
                  {formatDue(item.dueDate)}
                </span>
              )}
              {item.priority && (
                <span className={`chip pri-${item.priority}`}>{item.priority}</span>
              )}
              {folder && <span className="chip">📁 {folder.name}</span>}
              {item.tags.map((t) => (
                <span key={t} className="chip">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
