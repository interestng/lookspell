import type { Point } from '../types'
import type { Rect, Zone, ZoneCount } from './types'

const NINE_ZONE_MIN_SIDE = 600

export const zoneCountFor = (w: number, h: number): ZoneCount =>
  Math.min(w, h) >= NINE_ZONE_MIN_SIDE ? 9 : 6

export const gridFor = (n: ZoneCount) => (n === 9 ? { cols: 3, rows: 3 } : { cols: 2, rows: 3 })

export const zoneRects = (n: ZoneCount, area: Rect, gap: number): Rect[] => {
  const { cols, rows } = gridFor(n)
  const w = (area.w - gap * (cols - 1)) / cols
  const h = (area.h - gap * (rows - 1)) / rows
  return Array.from({ length: n }, (_, i) => ({
    x: area.x + (i % cols) * (w + gap),
    y: area.y + Math.floor(i / cols) * (h + gap),
    w,
    h,
  }))
}

export const hitTest = (rects: Rect[], zones: Zone[], p: Point): string | null => {
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    const zone = zones[i]
    if (!r || !zone || zone.inert) continue
    if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) return zone.id
  }
  return null
}
