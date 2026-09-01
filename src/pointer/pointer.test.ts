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
