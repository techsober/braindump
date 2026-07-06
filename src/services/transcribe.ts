// Transcription behind a service interface. Primary: the browser's free,
// on-device-ish Web Speech API. Fallback (browsers without it, e.g. some
// iOS/Firefox builds): record audio with MediaRecorder and send it to a
// transcription model — only if the user configured a key in Settings.
//
// Voice is just another input into capture. Whatever text exists when
// transcription ends — cleanly or not — is kept; a dropped API call or a
// cut-off recognition session never loses the capture.

import { getSetting } from './settings'

export interface TranscriptionSession {
  /** stop listening; any partial text already delivered stays delivered */
  stop(): void
}

export interface TranscriptionService {
  /** false = no path to transcription on this browser/config */
  available(): boolean
  /** why voice is unavailable, for the UI to explain */
  unavailableReason(): string
  start(handlers: {
    /** full transcript so far (finals + current interim) */
    onText(text: string, isFinal: boolean): void
    onEnd(): void
    onError(message: string): void
  }): Promise<TranscriptionSession>
}

// ---------- primary: Web Speech API ----------

type SpeechRecognitionCtor = new () => any

function speechCtor(): SpeechRecognitionCtor | null {
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

class WebSpeechTranscription implements TranscriptionService {
  available() {
    return speechCtor() != null
  }

  unavailableReason() {
    return 'Speech recognition is not supported by this browser.'
  }

  async start(handlers: Parameters<TranscriptionService['start']>[0]) {
    const Ctor = speechCtor()!
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = navigator.language || 'en-US'

    let finalText = ''
    let stopped = false

    rec.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      handlers.onText((finalText + interim).trim(), interim === '')
    }
    rec.onerror = (event: any) => {
      // 'no-speech'/'aborted' are routine ends, not failures. Whatever
      // text was already emitted stays in the capture box regardless.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        handlers.onError(`Transcription error: ${event.error}`)
      }
    }
    rec.onend = () => {
      if (!stopped) handlers.onEnd()
    }
    rec.start()

    return {
      stop() {
        stopped = true
        try {
          rec.stop()
        } catch {
          /* already stopped */
        }
        handlers.onEnd()
      },
    }
  }
}

// ---------- fallback: record + send to a transcription model ----------

class RecordAndSendTranscription implements TranscriptionService {
  available() {
    return (
      typeof MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      !!getSetting('openaiApiKey')
    )
  }

  unavailableReason() {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return 'This browser supports neither speech recognition nor audio recording.'
    }
    return 'This browser has no built-in speech recognition. Add a transcription API key in Settings to enable voice capture.'
  }

  async start(handlers: Parameters<TranscriptionService['start']>[0]) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      try {
        const audio = new Blob(chunks, { type: recorder.mimeType })
        const text = await transcribeBlob(audio)
        if (text) handlers.onText(text, true)
      } catch (err) {
        handlers.onError(
          `Transcription failed (${err instanceof Error ? err.message : 'unknown error'}). Your recording could not be converted — type the thought instead.`,
        )
      } finally {
        handlers.onEnd()
      }
    }
    recorder.start()

    return {
      stop() {
        if (recorder.state !== 'inactive') recorder.stop()
      },
    }
  }
}

async function transcribeBlob(audio: Blob): Promise<string> {
  const key = getSetting('openaiApiKey')
  if (!key) throw new Error('no transcription API key configured')
  const form = new FormData()
  form.append('file', audio, 'dump.webm')
  form.append('model', 'whisper-1')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = await res.json()
  return (data.text ?? '').trim()
}

// ---------- selection ----------

const webSpeech = new WebSpeechTranscription()
const recordAndSend = new RecordAndSendTranscription()

/** Pick the best transcription path for this browser/config right now. */
export function getTranscriptionService(): TranscriptionService {
  return webSpeech.available() ? webSpeech : recordAndSend
}
