// Export / backup. On a local-only app this is the user's ONLY backup —
// clearing the browser wipes IndexedDB — so it exports everything:
// JSON is round-trippable (full fidelity), Markdown is human-readable.

import type { Item, Folder } from '../types'
import { repository } from '../db/dexieRepository'
import { formatDue } from '../utils/dates'
import { displayTitle } from '../utils/items'

export async function exportJson(): Promise<void> {
  const [items, folders] = await Promise.all([
    repository.getAllItems(),
    repository.getAllFolders(),
  ])
  const payload = {
    app: 'braindump',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    folders,
    items,
  }
  download(JSON.stringify(payload, null, 2), `braindump-${stamp()}.json`, 'application/json')
}

export async function exportMarkdown(): Promise<void> {
  const [items, folders] = await Promise.all([
    repository.getAllItems(),
    repository.getAllFolders(),
  ])
  download(toMarkdown(items, folders), `braindump-${stamp()}.md`, 'text/markdown')
}

function toMarkdown(items: Item[], folders: Folder[]): string {
  const lines: string[] = [`# Brain Dump export — ${new Date().toLocaleString()}`, '']

  const tasks = items.filter((i) => i.type === 'task')
  const notes = items.filter((i) => i.type === 'note')
  const inbox = items.filter((i) => !i.triaged)

  lines.push('## Tasks', '')
  for (const task of tasks.filter((t) => t.status === 'open')) lines.push(taskLine(task))
  const done = tasks.filter((t) => t.status === 'done')
  if (done.length > 0) {
    lines.push('', '### Done', '')
    for (const task of done) lines.push(taskLine(task))
  }

  lines.push('', '## Notes', '')
  const groups: (Folder | null)[] = [...folders, null]
  for (const folder of groups) {
    const inFolder = notes.filter((n) => (n.folderId ?? null) === (folder?.id ?? null))
    if (inFolder.length === 0) continue
    lines.push(`### 📁 ${folder ? folder.name : 'No folder'}`, '')
    for (const note of inFolder) {
      const title = displayTitle(note)
      const body = note.body ?? note.rawText
      lines.push(`#### ${title}`)
      if (note.tags.length > 0) lines.push(note.tags.map((t) => `#${t}`).join(' '))
      if (body.trim() !== title) lines.push('', body)
      lines.push('')
    }
  }

  if (inbox.length > 0) {
    lines.push('', '## Inbox (untriaged)', '')
    for (const item of inbox) lines.push(`- ${item.rawText.replace(/\n/g, ' ')}`)
  }

  return lines.join('\n')
}

function taskLine(task: Item): string {
  const parts = [`- [${task.status === 'done' ? 'x' : ' '}] ${displayTitle(task)}`]
  if (task.dueDate != null) parts.push(`(due ${formatDue(task.dueDate)})`)
  if (task.priority) parts.push(`[${task.priority}]`)
  if (task.tags.length > 0) parts.push(task.tags.map((t) => `#${t}`).join(' '))
  return parts.join(' ')
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function download(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
