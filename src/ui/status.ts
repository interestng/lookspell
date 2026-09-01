import type { InputMode } from '../types'

export type StatusState = {
  face: 'found' | 'lost' | 'loading'
  calibration: 'ok' | 'poor' | 'none'
  mode: InputMode
  hint?: string
}

export const createStatus = (el: HTMLElement) => ({
  set(s: StatusState) {
    const parts = [s.mode, `face ${s.face}`, `cal ${s.calibration}`]
    if (s.hint) parts.push(s.hint)
    const text = parts.join(' · ')
    if (el.textContent !== text) el.textContent = text
    el.dataset.face = s.face
    el.dataset.cal = s.calibration
  },
})

export type Status = ReturnType<typeof createStatus>
