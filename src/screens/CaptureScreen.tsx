import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { ItemType } from '../types'

type TypeChoice = 'auto' | ItemType

/**
 * The home surface and the most important screen in the app.
 * Open -> keyboard up -> type or tap mic. Submit writes to IndexedDB
 * immediately (via store.capture); nothing network-shaped sits between
 * the user's thumb and the saved dump.
 */
export default function CaptureScreen() {
  const capture = useStore((s) => s.capture)
  const [text, setText] = useState('')
  const [typeChoice, setTypeChoice] = useState<TypeChoice>('auto')
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Zero taps to start typing: focus the box the moment the screen mounts.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function submit() {
    const rawText = text.trim()
    if (!rawText) return
    await capture({
      rawText,
      source: 'text',
      type: typeChoice === 'auto' ? undefined : typeChoice,
    })
    setText('')
    setTypeChoice('auto')
    inputRef.current?.focus() // keep the keyboard up for the next dump
    clearTimeout(toastTimer.current)
    setToast('Dumped ✓')
    toastTimer.current = setTimeout(() => setToast(null), 1400)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Desktop nicety: Enter dumps, Shift+Enter makes a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <div className="capture">
      <div className="capture-box">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Dump anything — a task, an idea, a note…"
          autoFocus
          enterKeyHint="done"
        />
        <div className="capture-controls">
          <div className="seg" role="group" aria-label="Item type">
            {(['auto', 'task', 'note'] as const).map((t) => (
              <button
                key={t}
                className={typeChoice === t ? 'on' : ''}
                onClick={() => setTypeChoice(t)}
              >
                {t === 'auto' ? '✨ Auto' : t === 'task' ? '☑ Task' : '📝 Note'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="dumpbtn" disabled={!text.trim()} onClick={() => void submit()}>
        Dump it
      </button>

      <p className="capture-hint">
        Saved on this device instantly — works fully offline.
      </p>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
