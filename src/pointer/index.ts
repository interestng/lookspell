import type { Point, PointerState } from '../types'
import { createOneEuro } from './one-euro'

const OFFSCREEN_TOLERANCE = 0.25

export const createPointer = (screen: { w: number; h: number }) => {
  const fx = createOneEuro()
  const fy = createOneEuro()
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
      const smoothed = { x: fx.filter(raw.x, t), y: fy.filter(raw.y, t) }
      last = clamp(smoothed)
      return { ...last, confident: !wayOff(smoothed) }
    },
    reset() {
      fx.reset()
      fy.reset()
    },
  }
}
