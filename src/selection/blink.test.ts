import { describe, it, expect } from 'vitest'
import { createBlinkDetector } from './blink'

const closed = { left: 0.9, right: 0.9 }
const open = { left: 0.1, right: 0.1 }

describe('blink detector', () => {
  it('ignores a natural short blink', () => {
    const d = createBlinkDetector()
    expect(d.update(closed, 0)).toBe(false)
    expect(d.update(closed, 150)).toBe(false)
    expect(d.update(open, 200)).toBe(false)
  })
  it('fires on a deliberate long blink when eyes reopen', () => {
    const d = createBlinkDetector()
    d.update(closed, 0)
    d.update(closed, 400)
    expect(d.update(open, 500)).toBe(true)
    expect(d.update(open, 600)).toBe(false)
  })
  it('ignores eyes held closed too long', () => {
    const d = createBlinkDetector()
    d.update(closed, 0)
    d.update(closed, 1200)
    expect(d.update(open, 1300)).toBe(false)
  })
  it('needs both eyes', () => {
    const d = createBlinkDetector()
    d.update({ left: 0.9, right: 0.1 }, 0)
    d.update({ left: 0.9, right: 0.1 }, 500)
    expect(d.update(open, 600)).toBe(false)
  })
})
