import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Item } from '../types'
import ItemEditor from '../components/ItemEditor'
import { displayTitle } from '../utils/items'
import { formatDue, formatRelative } from '../utils/dates'

/**
 * The triage loop. Everything captured lands here untriaged (with AI
 * suggestions attached when classification succeeded, bare when it
 * didn't). One tap to confirm, one tap to flip type, tap the card to
 * edit any field. Confirm/edit sets triaged: true and the item flows
 * into the Tasks/Notes views.
 */
export default function InboxScreen() {
  const items = useStore((s) => s.items)
  const classifying = useStore((s) => s.classifying)
  const triageItem = useStore((s) => s.triageItem)
  const updateItem = useStore((s) => s.updateItem)
  const [editing, setEditing] = useState<Item | null>(null)

  const inbox = useMemo(() => items.filter((i) => !i.triaged), [items])

  if (inbox.length === 0) {
    return (
      <div className="empty">
        <span className="empty-icon">🎉</span>
        Inbox zero. Every dump is triaged.
      </div>
    )
  }

  return (
    <div>
      <h2 className="section-title">
        To triage <span className="count">{inbox.length}</span>
      </h2>
      {inbox.map((item) => {
        const pending = classifying.has(item.id)
        const overdue = item.dueDate != null && item.dueDate < Date.now()
        return (
          <div key={item.id} className="card inbox-card" onClick={() => setEditing(item)}>
            <div className="card-text">
              <div className="card-title">{displayTitle(item)}</div>
              {item.title && item.rawText !== item.title && (
                <div className="card-sub">{item.rawText}</div>
              )}
              <div className="card-meta">
                <span className={`chip type-${item.type}`}>
                  {item.type === 'task' ? '☑ task' : '📝 note'}
                </span>
                {item.dueDate != null && (
                  <span className={`chip due ${overdue ? 'overdue' : ''}`}>
                    📅 {formatDue(item.dueDate)}
                  </span>
                )}
                {item.priority && (
                  <span className={`chip pri-${item.priority}`}>{item.priority}</span>
                )}
                {item.tags.map((t) => (
                  <span key={t} className="chip">
                    #{t}
                  </span>
                ))}
                {item.source === 'voice' && <span className="chip">🎙 voice</span>}
              </div>
              <div className="ai-note">
                {pending ? (
                  <>
                    <span className="spin" /> sorting…
                  </>
                ) : item.aiClassified ? (
                  <>✨ AI suggestion — confirm or fix it</>
                ) : (
                  <>unsorted · {formatRelative(item.createdAt)}</>
                )}
              </div>
              <div className="inbox-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    void updateItem(item.id, {
                      type: item.type === 'task' ? 'note' : 'task',
                      aiClassified: false,
                    })
                  }}
                >
                  ⇄ Make {item.type === 'task' ? 'note' : 'task'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(item)
                  }}
                >
                  Edit
                </button>
                <button
                  className="confirm"
                  onClick={(e) => {
                    e.stopPropagation()
                    void triageItem(item.id)
                  }}
                >
                  ✓ Confirm
                </button>
              </div>
            </div>
          </div>
        )
      })}
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
