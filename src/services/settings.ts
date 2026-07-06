// Tiny settings store (localStorage). Keys live only on this device.
//
// ⚠️ Security note from the build brief: client-side API keys are
// acceptable ONLY while this app runs on the owner's own device. Before
// sharing the app with anyone, these calls must move behind a backend.

export type SettingKey = 'anthropicApiKey' | 'openaiApiKey'

const PREFIX = 'braindump.settings.'

export function getSetting(key: SettingKey): string {
  return localStorage.getItem(PREFIX + key) ?? ''
}

export function setSetting(key: SettingKey, value: string): void {
  if (value) localStorage.setItem(PREFIX + key, value)
  else localStorage.removeItem(PREFIX + key)
}
