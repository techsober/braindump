// Single-user v1: one stable local user id, stamped on every item and
// folder so cloud accounts become a data migration, not a schema change.
// This module is the ONLY place that knows v1 is single-user.

const KEY = 'braindump.userId'

export function currentUserId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `local-${crypto.randomUUID()}`
    localStorage.setItem(KEY, id)
  }
  return id
}
