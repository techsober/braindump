# Brain Dump

A single-surface capture app: dump any raw thought — typed or spoken — into one box, and it gets sorted into a **task** or a **note** with tags, priority, and a due date parsed from natural language. You confirm or fix with one tap in the Inbox.

**The one non-negotiable:** every dump is saved to local storage (IndexedDB) the instant it's entered, *before* any AI or transcription runs. AI is an enhancement on top of a capture that always works — never a gate. If the API is down, you're offline, or no key is configured, items simply wait in the Inbox untriaged. Nothing is ever lost.

## v1 scope

Single user · one device · local-only · mobile-first · installable PWA that works offline.

- **Capture** — home screen *is* the capture box; opens focused, saves instantly. Auto/Task/Note toggle + mic button next to the input.
- **Voice capture** — Web Speech API for live transcription (free, on-device-ish), with a record-and-send Whisper fallback for browsers without it. Partial transcripts are kept; a failed transcription never loses the capture.
- **AI classification** — async, after the local save, on a Haiku-class model called directly from the client with your own key. Suggests type / title / tags / priority / due date; every suggestion is one-tap editable.
- **Inbox** — the triage loop. Untriaged items with AI suggestions inline; confirm, edit, or flip type.
- **Tasks** — Today (incl. overdue) / This Week / Later / No Date, mark-done, priority sort, tag filter. No folders for tasks, by design.
- **Notes** — folders (a note's single home) + cross-cutting tags + recency. Create/rename/delete folders.
- **Search** — full-text across everything, behind a service interface (semantic search slots in later via the reserved `embedding` field).
- **Export/backup** — one-tap Markdown (readable) + JSON (round-trippable) from Settings. On a local-only app this is your only backup.

## Running it

```sh
npm install
npm run dev        # dev server
npm run build      # type-check + production build (dist/)
npm run preview    # serve the production build
npm run icons      # regenerate PWA icons (pure node, no deps)
```

Open it on your phone (serve `dist/` over HTTPS or use the dev server on your LAN) and "Add to Home Screen" to install.

### API keys (optional, Settings ⚙)

- **Anthropic key** — enables AI sorting of dumps. Without it, capture and manual triage work fully.
- **OpenAI key** — enables the voice fallback (Whisper) on browsers without built-in speech recognition.

> ⚠️ Keys live in `localStorage` and are used client-side. That is acceptable **only** because v1 runs on your own device. Before sharing this app with anyone, the AI calls must move behind a backend — a client-side key is exposed to every user.

## Architecture (why v1 doesn't become a rewrite)

- **Repository abstraction** (`src/db/repository.ts`) — the UI never touches Dexie; swapping IndexedDB for an API-backed store is confined to `src/db/`.
- **Service interfaces** — `classify()`, `transcribe()`, `search()` (`src/services/`) so model, provider, client-vs-server location, or search strategy change without UI edits.
- **One unified `Item` entity** — task/note is a field, so the type toggle is trivial. `userId` is stamped on everything now (accounts become a data migration, not a schema change); `rawText` is preserved immutably; `recurrence` and `embedding` are reserved fields for the post-v1 roadmap.

## Deliberate non-goals for v1

Calendar sync, cloud sync/accounts, reminders/recurring tasks, semantic search, daily planning, native capture surfaces (share sheet/widget/Siri), collaboration, attachments, note linking. The data model and service boundaries are shaped so each of these slots in later — but none of them are built now.
