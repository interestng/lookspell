import type { BlinkFeatures } from '../types'
import { BLINK } from './config'

export const createBlinkDetector = () => {
  let closedSince: number | null = null

  return {
    update(b: BlinkFeatures, t: number): boolean {
      const closed = b.left > BLINK.threshold && b.right > BLINK.threshold
      if (closed) {
        closedSince ??= t
        return false
      }
      if (closedSince === null) return false
      const held = t - closedSince
      closedSince = null
      return held >= BLINK.minMs && held <= BLINK.maxMs
    },
  }
}
