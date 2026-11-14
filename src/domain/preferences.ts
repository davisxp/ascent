/**
 * User preferences domain types.
 */

export type Theme = 'light' | 'dark' | 'system'
export type Sound = 'on' | 'muted'

export type UserSettings = {
  theme: Theme
  sound: Sound
  defaultRestSeconds: number
  units: 'metric' | 'imperial'
  wakeLock: boolean
  reducedMotion: boolean
}

export const defaultSettings: UserSettings = {
  theme: 'light',
  sound: 'on',
  defaultRestSeconds: 60,
  units: 'metric',
  wakeLock: true,
  reducedMotion: false,
}
