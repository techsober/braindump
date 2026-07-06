import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import CaptureScreen from './screens/CaptureScreen'
import TasksScreen from './screens/TasksScreen'
import NotesScreen from './screens/NotesScreen'
import InboxScreen from './screens/InboxScreen'

type Tab = 'capture' | 'inbox' | 'tasks' | 'notes'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'capture', icon: '⚡', label: 'Capture' },
  { id: 'inbox', icon: '📥', label: 'Inbox' },
  { id: 'tasks', icon: '☑', label: 'Tasks' },
  { id: 'notes', icon: '📝', label: 'Notes' },
]

export default function App() {
  const load = useStore((s) => s.load)
  const loaded = useStore((s) => s.loaded)
  const inboxCount = useStore((s) => s.items.filter((i) => !i.triaged).length)
  const [tab, setTab] = useState<Tab>('capture')

  useEffect(() => {
    void load()
  }, [load])

  if (!loaded) return null

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Brain Dump</span>
        <span className="spacer" />
      </header>

      <main className="screen">
        {tab === 'capture' && <CaptureScreen />}
        {tab === 'tasks' && <TasksScreen />}
        {tab === 'notes' && <NotesScreen />}
        {tab === 'inbox' && <InboxScreen />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
            {t.id === 'inbox' && inboxCount > 0 && <span className="badge">{inboxCount}</span>}
          </button>
        ))}
      </nav>
    </div>
  )
}
