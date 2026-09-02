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

const inside = (r: Rect, p: Point, m = 0) =>
  p.x >= r.x - m && p.x < r.x + r.w + m && p.y >= r.y - m && p.y < r.y + r.h + m

export const hitTest = (rects: Rect[], zones: Zone[], p: Point): string | null => {
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    const zone = zones[i]
    if (!r || !zone || zone.inert) continue
    if (inside(r, p)) return zone.id
  }
  return null
}

// hysteresis: the hovered zone keeps the pointer until it is clearly outside, by margin times the
// zone's shorter side, so jitter on a border does not restart the dwell
export const stickyHit = (
  rects: Rect[],
  zones: Zone[],
  p: Point,
  current: string | null,
  margin: number,
): string | null => {
  if (current !== null) {
    const i = zones.findIndex((z) => z.id === current)
    const r = rects[i]
    const z = zones[i]
    if (r && z && !z.inert && inside(r, p, margin * Math.min(r.w, r.h))) return current
  }
  return hitTest(rects, zones, p)
}
