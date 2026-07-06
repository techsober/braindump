import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { getTranscriptionService, type TranscriptionSession } from '../services/transcribe'
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
  const [recording, setRecording] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const session = useRef<TranscriptionSession | null>(null)
  // text that was in the box when the mic started; transcript appends to it
  const preVoiceText = useRef('')

  // Zero taps to start typing: focus the box the moment the screen mounts.
  useEffect(() => {
    inputRef.current?.focus()
    return () => session.current?.stop()
  }, [])

  function showToast(msg: string, ms = 1400) {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  async function submit(source: 'text' | 'voice' = 'text') {
    session.current?.stop()
    const rawText = text.trim()
    if (!rawText) return
    await capture({
      rawText,
      source,
      type: typeChoice === 'auto' ? undefined : typeChoice,
    })
    setText('')
    setTypeChoice('auto')
    inputRef.current?.focus() // keep the keyboard up for the next dump
    showToast('Dumped ✓')
  }

  const voiceUsed = useRef(false)

  async function toggleMic() {
    if (recording) {
      session.current?.stop()
      return
    }
    const service = getTranscriptionService()
    if (!service.available()) {
      showToast(service.unavailableReason(), 3200)
      return
    }
    voiceUsed.current = true
    preVoiceText.current = text ? text.replace(/\s*$/, ' ') : ''
    try {
      setRecording(true)
      session.current = await service.start({
        onText(t) {
          // Every partial lands in the box immediately: if recognition is
          // cut off or errors, whatever text exists is already the capture.
          setText(preVoiceText.current + t)
        },
        onEnd() {
          setRecording(false)
          session.current = null
          inputRef.current?.focus()
        },
        onError(message) {
          showToast(message, 3200)
        },
      })
    } catch (err) {
      // e.g. mic permission denied
      setRecording(false)
      session.current = null
      showToast(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone access was denied.'
          : 'Could not start voice capture.',
        3200,
      )
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Desktop nicety: Enter dumps, Shift+Enter makes a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit(voiceUsed.current ? 'voice' : 'text')
    }
  }

  function onManualEdit(value: string) {
    setText(value)
    if (!value) voiceUsed.current = false
  }

  return (
    <div className="capture">
      <div className="capture-box">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => onManualEdit(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={recording ? 'Listening…' : 'Dump anything — a task, an idea, a note…'}
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
          <button
            className={`micbtn ${recording ? 'recording' : ''}`}
            onClick={() => void toggleMic()}
            aria-label={recording ? 'Stop voice capture' : 'Start voice capture'}
          >
            {recording ? '⏹' : '🎙'}
          </button>
        </div>
      </div>

      <button
        className="dumpbtn"
        disabled={!text.trim()}
        onClick={() => void submit(voiceUsed.current ? 'voice' : 'text')}
      >
        Dump it
      </button>

      <p className="capture-hint">
        Saved on this device instantly — works fully offline.
      </p>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
