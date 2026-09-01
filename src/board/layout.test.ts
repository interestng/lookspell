import { describe, it, expect } from 'vitest'
import { zoneCountFor, gridFor, zoneRects, hitTest } from './layout'
import type { Zone } from './types'

describe('layout', () => {
  it('picks 9 zones for a laptop and 6 for a phone', () => {
    expect(zoneCountFor(1440, 900)).toBe(9)
    expect(zoneCountFor(390, 844)).toBe(6)
    expect(zoneCountFor(844, 390)).toBe(6)
  })
  it('grid shapes', () => {
    expect(gridFor(9)).toEqual({ cols: 3, rows: 3 })
    expect(gridFor(6)).toEqual({ cols: 2, rows: 3 })
  })
  it('rects tile the area row-major with gaps', () => {
    const r = zoneRects(9, { x: 0, y: 100, w: 300, h: 300 }, 0)
    expect(r).toHaveLength(9)
    expect(r[0]).toEqual({ x: 0, y: 100, w: 100, h: 100 })
    expect(r[1]).toEqual({ x: 100, y: 100, w: 100, h: 100 })
    expect(r[3]).toEqual({ x: 0, y: 200, w: 100, h: 100 })
  })
  it('hit test skips inert zones and misses gaps', () => {
    const rects = zoneRects(9, { x: 0, y: 0, w: 300, h: 300 }, 10)
    const zones: Zone[] = Array.from({ length: 9 }, (_, i) => ({
      id: `z${i}`,
      label: '',
      action: { kind: 'none' },
      inert: i === 4,
    }))
    expect(hitTest(rects, zones, { x: 20, y: 20 })).toBe('z0')
    expect(hitTest(rects, zones, { x: 150, y: 150 })).toBeNull()
    expect(hitTest(rects, zones, { x: 99, y: 20 })).toBeNull()
  })
})
