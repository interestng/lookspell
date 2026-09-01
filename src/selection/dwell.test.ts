import { describe, it, expect } from 'vitest'
import { createDwellMachine } from './index'

const step = (
  m: ReturnType<typeof createDwellMachine>,
  zone: string | null,
  t: number,
  extra = {},
) => m.update({ zone, confident: true, confirm: false, mode: 'dwell', t, ...extra })

describe('dwell machine', () => {
  it('selects after dwellMs on one zone', () => {
    const m = createDwellMachine({ dwellMs: 900, graceMs: 150, cooldownMs: 500 })
    expect(step(m, 'a', 0)).toBeNull()
    expect(m.status().state).toBe('hovering')
    expect(step(m, 'a', 500)).toBeNull()
    expect(m.status().progress).toBeCloseTo(500 / 900, 2)
    expect(step(m, 'a', 900)).toEqual({ zone: 'a', t: 900 })
    expect(m.status().state).toBe('cooldown')
  })
  it('keeps hovering through a short loss within grace', () => {
    const m = createDwellMachine()
    step(m, 'a', 0)
    step(m, null, 100)
    expect(m.status().state).toBe('hovering')
    step(m, 'a', 200)
    expect(m.status().zone).toBe('a')
  })
  it('resets after loss beyond grace', () => {
    const m = createDwellMachine()
    step(m, 'a', 0)
    step(m, null, 100)
    step(m, null, 400)
    expect(m.status().state).toBe('idle')
  })
  it('switching zones restarts the timer', () => {
    const m = createDwellMachine()
    step(m, 'a', 0)
    step(m, 'b', 500)
    expect(m.status().zone).toBe('b')
    expect(m.status().progress).toBe(0)
  })
  it('does not select again during cooldown', () => {
    const m = createDwellMachine()
    step(m, 'a', 0)
    step(m, 'a', 900)
    expect(step(m, 'a', 1000)).toBeNull()
    expect(m.status().state).toBe('cooldown')
    step(m, 'a', 1500)
    expect(m.status().state).toBe('hovering')
  })
  it('pauses when not confident and never selects', () => {
    const m = createDwellMachine()
    step(m, 'a', 0)
    expect(step(m, 'a', 800, { confident: false })).toBeNull()
    expect(m.status().state).toBe('paused')
    expect(step(m, 'a', 2000, { confident: false })).toBeNull()
    step(m, 'a', 2100)
    expect(m.status().state).toBe('hovering')
    expect(m.status().progress).toBe(0)
  })
  it('in blink mode selects on confirm, not on time', () => {
    const m = createDwellMachine()
    expect(step(m, 'a', 0, { mode: 'blink' })).toBeNull()
    expect(step(m, 'a', 3000, { mode: 'blink' })).toBeNull()
    expect(m.status().progress).toBe(1)
    expect(step(m, 'a', 3100, { mode: 'blink', confirm: true })).toEqual({ zone: 'a', t: 3100 })
  })
  it('accepts config changes', () => {
    const m = createDwellMachine()
    m.setConfig({ dwellMs: 300 })
    step(m, 'a', 0)
    expect(step(m, 'a', 300)).toEqual({ zone: 'a', t: 300 })
  })
})
