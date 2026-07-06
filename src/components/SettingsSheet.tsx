import { useState } from 'react'
import { getSetting, setSetting } from '../services/settings'

interface Props {
  onClose(): void
}

export default function SettingsSheet({ onClose }: Props) {
  const [anthropicKey, setAnthropicKey] = useState(getSetting('anthropicApiKey'))
  const [openaiKey, setOpenaiKey] = useState(getSetting('openaiApiKey'))

  function save() {
    setSetting('anthropicApiKey', anthropicKey.trim())
    setSetting('openaiApiKey', openaiKey.trim())
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />

        <div className="field">
          <label>Anthropic API key — AI sorting</label>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
          />
          <p className="capture-hint" style={{ textAlign: 'left', marginTop: 6 }}>
            Optional. With a key, dumps get auto-sorted into task/note with tags, priority and
            due dates. Without one, everything still captures instantly — you just sort dumps
            yourself in the Inbox.
          </p>
        </div>

        <div className="field">
          <label>OpenAI API key — voice fallback</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
          />
          <p className="capture-hint" style={{ textAlign: 'left', marginTop: 6 }}>
            Optional. Only used on browsers without built-in speech recognition: voice is
            recorded and sent to Whisper for transcription.
          </p>
        </div>

        <p className="capture-hint" style={{ textAlign: 'left' }}>
          ⚠️ Keys are stored only on this device and sent only to their own provider. This
          app is single-user: never publish or share a build with your keys configured.
        </p>

        <div className="sheet-actions">
          <button className="primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
