import { describe, it, expect } from 'vitest'
import { createPointer } from './index'

const screen = { w: 1000, h: 600 }

describe('createPointer', () => {
  it('passes a normal point through as confident', () => {
    const p = createPointer(screen)
    const s = p.update({ x: 300, y: 200 }, 0)
    expect(s).toEqual({ x: 300, y: 200, confident: true })
  })
  it('marks null as not confident and keeps last position', () => {
    const p = createPointer(screen)
    p.update({ x: 300, y: 200 }, 0)
    const s = p.update(null, 16)
    expect(s.confident).toBe(false)
    expect(s.x).toBeCloseTo(300)
  })
  it('marks far off-screen points as not confident and clamps', () => {
    const p = createPointer(screen)
    const s = p.update({ x: -400, y: 200 }, 0)
    expect(s.confident).toBe(false)
    expect(s.x).toBe(0)
  })
  it('keeps slightly off-screen points confident but clamped', () => {
    const p = createPointer(screen)
    const s = p.update({ x: 1100, y: 200 }, 0)
    expect(s.confident).toBe(true)
    expect(s.x).toBe(1000)
  })
})

describe('createMedian', () => {
  it('returns the median of the last n values', async () => {
    const { createMedian } = await import('./median')
    const m = createMedian(5)
    expect(m.push(10)).toBe(10)
    expect(m.push(100)).toBe(55)
    expect(m.push(12)).toBe(12)
    expect(m.push(11)).toBe(11.5)
    expect(m.push(13)).toBe(12)
    // the spike at 100 falls out of the window
    expect(m.push(12)).toBe(12)
  })
})

describe('createPointer smoothing options', () => {
  it('a lower cutoff damps jitter more than the default', () => {
    const jitter = (opts?: { minCutoff: number }) => {
      const p = createPointer(screen, opts)
      const xs: number[] = []
      for (let i = 0; i < 300; i++) {
        const last = p.update({ x: 500 + (i % 2 ? 20 : -20), y: 300 }, i * 16)
        if (i > 100) xs.push(last.x)
      }
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(jitter({ minCutoff: 0.3 })).toBeLessThan(jitter())
  })
})
