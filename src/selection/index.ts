import type { ConfirmMode } from '../types'
import { DEFAULT_DWELL, type DwellConfig } from './config'

export { DEFAULT_DWELL, DWELL_RANGE, BLINK, type DwellConfig } from './config'
export { createBlinkDetector } from './blink'
export { createLeaveGuard } from './leave-guard'

export type DwellState = 'idle' | 'hovering' | 'cooldown' | 'paused'
export type DwellStatus = { state: DwellState; zone: string | null; progress: number }
export type SelectionEvent = { zone: string; t: number }
export type DwellInput = {
  zone: string | null
  confident: boolean
  confirm: boolean
  t: number
  mode: ConfirmMode
}

export const createDwellMachine = (overrides: Partial<DwellConfig> = {}) => {
  let cfg: DwellConfig = { ...DEFAULT_DWELL, ...overrides }
  let state: DwellState = 'idle'
  let zone: string | null = null
  let enteredAt = 0
  let lastSeenAt = 0
  let cooldownUntil = 0
  let progress = 0

  const toIdle = () => {
    state = 'idle'
    zone = null
    progress = 0
  }

  const select = (id: string, t: number): SelectionEvent => {
    state = 'cooldown'
    cooldownUntil = t + cfg.cooldownMs
    progress = 0
    return { zone: id, t }
  }

  return {
    update(input: DwellInput): SelectionEvent | null {
      const { t } = input
      if (!input.confident) {
        state = 'paused'
        zone = null
        progress = 0
        return null
      }
      if (state === 'paused') toIdle()
      if (state === 'cooldown') {
        if (t < cooldownUntil) return null
        toIdle()
      }
      if (input.zone === null) {
        if (state === 'hovering' && t - lastSeenAt > cfg.graceMs) toIdle()
        return null
      }
      if (state === 'idle' || input.zone !== zone) {
        state = 'hovering'
        zone = input.zone
        enteredAt = t
        progress = 0
      }
      lastSeenAt = t
      if (input.mode === 'blink') {
        progress = 1
        return input.confirm ? select(input.zone, t) : null
      }
      progress = Math.min((t - enteredAt) / cfg.dwellMs, 1)
      return progress >= 1 ? select(input.zone, t) : null
    },
    status(): DwellStatus {
      return { state, zone, progress }
    },
    setConfig(next: Partial<DwellConfig>) {
      cfg = { ...cfg, ...next }
    },
  }
}
