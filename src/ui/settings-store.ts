import type { ConfirmMode, InputMode } from '../types'
import { DEFAULT_DWELL, DWELL_RANGE } from '../selection'
import { DEFAULT_PHRASES } from '../board'

export type Smoothing = 'low' | 'medium' | 'high'
export type CalibrationDepth = 'quick' | 'full'

export type Settings = {
  inputMode: InputMode
  confirmMode: ConfirmMode
  dwellMs: number
  smoothing: Smoothing
  calibration: CalibrationDepth
  phrases: string[]
  voice: string | null
  zoneOverride: 9 | 6 | null
  showPreview: boolean
  mirror: boolean
  seenStart: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  inputMode: 'both',
  confirmMode: 'dwell',
  dwellMs: DEFAULT_DWELL.dwellMs,
  smoothing: 'medium',
  calibration: 'full',
  phrases: DEFAULT_PHRASES,
  voice: null,
  zoneOverride: null,
  showPreview: true,
  mirror: true,
  seenStart: false,
}

// one euro min cutoff in hz for gaze mode, lower is steadier but lags more
export const SMOOTHING_CUTOFF: Record<Smoothing, number> = { low: 1, medium: 0.5, high: 0.25 }

const KEY = 'settings'
const SMOOTHINGS: Smoothing[] = ['low', 'medium', 'high']

export const loadSettings = (storage: Pick<Storage, 'getItem'>): Settings => {
  try {
    const raw = storage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {}
    const merged = { ...DEFAULT_SETTINGS, ...parsed }
    merged.dwellMs = Math.min(Math.max(merged.dwellMs, DWELL_RANGE.min), DWELL_RANGE.max)
    if (!SMOOTHINGS.includes(merged.smoothing)) merged.smoothing = DEFAULT_SETTINGS.smoothing
    if (merged.calibration !== 'quick') merged.calibration = 'full'
    merged.phrases = Array.isArray(merged.phrases)
      ? merged.phrases.map((p) => String(p).trim()).filter(Boolean)
      : DEFAULT_PHRASES
    return merged
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const saveSettings = (storage: Pick<Storage, 'setItem'>, s: Settings) =>
  storage.setItem(KEY, JSON.stringify(s))
