import type { ConfirmMode, InputMode } from '../types'
import { DEFAULT_DWELL, DWELL_RANGE } from '../selection'

export type Settings = {
  inputMode: InputMode
  confirmMode: ConfirmMode
  dwellMs: number
  voice: string | null
  zoneOverride: 9 | 6 | null
  showPreview: boolean
  mirror: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  inputMode: 'gaze',
  confirmMode: 'dwell',
  dwellMs: DEFAULT_DWELL.dwellMs,
  voice: null,
  zoneOverride: null,
  showPreview: true,
  mirror: true,
}

const KEY = 'settings'

export const loadSettings = (storage: Pick<Storage, 'getItem'>): Settings => {
  try {
    const raw = storage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {}
    const merged = { ...DEFAULT_SETTINGS, ...parsed }
    merged.dwellMs = Math.min(Math.max(merged.dwellMs, DWELL_RANGE.min), DWELL_RANGE.max)
    return merged
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const saveSettings = (storage: Pick<Storage, 'setItem'>, s: Settings) =>
  storage.setItem(KEY, JSON.stringify(s))
