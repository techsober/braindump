// Local-time date helpers for the time views (Today / This Week / No Date).

export function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfToday(): number {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/** end of the current week, Sunday 23:59 local (Monday-start week) */
export function endOfWeek(): number {
  const d = new Date()
  const day = d.getDay() // 0 = Sunday
  const daysLeft = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + daysLeft)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function formatDue(ts: number): string {
  const due = new Date(ts)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(due, today)) return 'Today'
  if (sameDay(due, tomorrow)) return 'Tomorrow'
  const opts: Intl.DateTimeFormatOptions =
    due.getFullYear() === today.getFullYear()
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  return due.toLocaleDateString(undefined, opts)
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** timestamp -> value for <input type="date"> (local) */
export function toDateInput(ts: number | null): string {
  if (ts == null) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** <input type="date"> value -> local timestamp at 09:00, or null */
export function fromDateInput(value: string): number | null {
  if (!value) return null
  const [y, m, day] = value.split('-').map(Number)
  return new Date(y, m - 1, day, 9, 0, 0, 0).getTime()
}
