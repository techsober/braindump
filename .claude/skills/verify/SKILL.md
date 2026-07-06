---
name: verify
description: Build, launch, and drive the Brain Dump PWA end-to-end in headless Chromium to verify changes at the real UI surface.
---

# Verifying Brain Dump

## Build + serve

```sh
npm run build                                   # tsc + vite build + PWA/service worker
npm run preview -- --port 4173 --host 127.0.0.1 # serve dist/ (run in background)
```

## Drive it (Playwright)

Playwright is not a project dep — install `playwright-core` in a scratch dir and
use the preinstalled browser (do NOT run `playwright install`):

```js
import { chromium } from 'playwright-core'
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
})
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
```

(If that pinned path is missing, `ls /opt/pw-browsers/` for the current one.)

## Flows worth driving

- **Capture (the non-negotiable):** fill `.capture-box textarea`, click `.dumpbtn`,
  then read IndexedDB db `braindump`, store `items` — the dump must be there even
  with `context.setOffline(true)` and no API key configured.
- **Triage:** Inbox tab → `.inbox-card` buttons "Make task/note", "Confirm";
  badge on the Inbox tab is `.tabbar .badge`.
- **Tasks:** Today/This Week/Later/No Date grouping under `.section-title`;
  `.checkbox` marks done; editor sheet opens on card tap (`.sheet`).
- **Notes:** `.folder-row` navigation, folder select inside the editor sheet.
- **Search:** top-bar `.iconbtn[aria-label="Search"]`, results in `.search-results`.
- **Export:** Settings gear → Markdown/JSON buttons; catch `page.waitForEvent('download')`.
- **Persistence:** `page.reload()` and re-read IndexedDB.

## Gotchas

- AI classification is a detached post-save hook: without an Anthropic key in
  Settings it silently does nothing — that IS the graceful-degradation path,
  not a failure.
- The app auto-focuses the capture textarea on load; `document.activeElement`
  check is a good smoke signal.
- Voice capture needs real mic + speech APIs; headless can only verify the
  unavailable-path toast.
