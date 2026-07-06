import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Item } from '../types'
import ItemCard from '../components/ItemCard'
import ItemEditor from '../components/ItemEditor'
import { endOfToday, endOfWeek } from '../utils/dates'
import { byPriority, allTags } from '../utils/items'

export default function TasksScreen() {
  const items = useStore((s) => s.items)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)

  const tasks = useMemo(
    () =>
      items.filter(
        (i) => i.type === 'task' && i.triaged && (!tagFilter || i.tags.includes(tagFilter)),
      ),
    [items, tagFilter],
  )

  const groups = useMemo(() => {
    const open = tasks.filter((t) => t.status === 'open')
    const eod = endOfToday()
    const eow = endOfWeek()
    return {
      // overdue tasks surface at the top of Today — they're still today's problem
      today: open.filter((t) => t.dueDate != null && t.dueDate <= eod).sort(byPriority),
      week: open.filter((t) => t.dueDate != null && t.dueDate > eod && t.dueDate <= eow).sort(byPriority),
      later: open.filter((t) => t.dueDate != null && t.dueDate > eow).sort(byPriority),
      noDate: open.filter((t) => t.dueDate == null).sort(byPriority),
      done: tasks.filter((t) => t.status === 'done'),
    }
  }, [tasks])

  const tags = allTags(items)
  const hasAnything = tasks.length > 0

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

      {!hasAnything && (
        <div className="empty">
          <span className="empty-icon">☑</span>
          No tasks yet. Dump a thought on the Capture tab —<br />
          anything actionable lands here once triaged.
        </div>
      )}

      {(
        [
          ['Today', groups.today],
          ['This Week', groups.week],
          ['Later', groups.later],
          ['No Date', groups.noDate],
        ] as const
      ).map(
        ([label, group]) =>
          group.length > 0 && (
            <section key={label}>
              <h2 className="section-title">
                {label} <span className="count">{group.length}</span>
              </h2>
              {group.map((item) => (
                <ItemCard key={item.id} item={item} onOpen={setEditing} />
              ))}
            </section>
          ),
      )}

      {groups.done.length > 0 && (
        <section>
          <h2 className="section-title">
            <button onClick={() => setShowDone(!showDone)}>
              {showDone ? '▾' : '▸'} Done <span className="count">{groups.done.length}</span>
            </button>
          </h2>
          {showDone &&
            groups.done.map((item) => <ItemCard key={item.id} item={item} onOpen={setEditing} />)}
        </section>
      )}

      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
