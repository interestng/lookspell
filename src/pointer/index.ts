import type { Point, PointerState } from '../types'
import { createMedian } from './median'
import { createOneEuro } from './one-euro'

export { createMedian } from './median'

const OFFSCREEN_TOLERANCE = 0.25
const MEDIAN_WINDOW = 5

export type PointerOpts = { minCutoff?: number; beta?: number; median?: boolean; deadband?: number }

export const createPointer = (screen: { w: number; h: number }, opts: PointerOpts = {}) => {
  const euro = { minCutoff: opts.minCutoff, beta: opts.beta }
  const fx = createOneEuro(euro)
  const fy = createOneEuro(euro)
  const mx = createMedian(MEDIAN_WINDOW)
  const my = createMedian(MEDIAN_WINDOW)
  const useMedian = opts.median ?? false
  // the pointer does not move at all for changes smaller than this, so a fixating eye is still
  const deadband = opts.deadband ?? 0
  let last: Point = { x: screen.w / 2, y: screen.h / 2 }

  const clamp = (p: Point): Point => ({
    x: Math.min(Math.max(p.x, 0), screen.w),
    y: Math.min(Math.max(p.y, 0), screen.h),
  })

  const wayOff = (p: Point) =>
    p.x < -screen.w * OFFSCREEN_TOLERANCE ||
    p.x > screen.w * (1 + OFFSCREEN_TOLERANCE) ||
    p.y < -screen.h * OFFSCREEN_TOLERANCE ||
    p.y > screen.h * (1 + OFFSCREEN_TOLERANCE)

  return {
    update(raw: Point | null, t: number): PointerState {
      if (!raw) return { ...last, confident: false }
      const pre = useMedian ? { x: mx.push(raw.x), y: my.push(raw.y) } : raw
      const smoothed = { x: fx.filter(pre.x, t), y: fy.filter(pre.y, t) }
      const next = clamp(smoothed)
      if (Math.hypot(next.x - last.x, next.y - last.y) >= deadband) last = next
      return { ...last, confident: !wayOff(smoothed) }
    },
    reset() {
      fx.reset()
      fy.reset()
      mx.reset()
      my.reset()
    },
  }
}
