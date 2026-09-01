import { describe, it, expect } from 'vitest'
import { createLeaveGuard } from './leave-guard'

describe('leave guard', () => {
  it('passes zones through when nothing was selected', () => {
    const g = createLeaveGuard()
    expect(g.filter(2)).toBe(2)
    expect(g.filter(null)).toBeNull()
  })
  it('blocks the selected slot until the pointer leaves it', () => {
    const g = createLeaveGuard()
    g.selected(4)
    expect(g.filter(4)).toBeNull()
    expect(g.filter(4)).toBeNull()
    expect(g.filter(null)).toBeNull()
    expect(g.filter(4)).toBe(4)
  })
  it('a different slot releases the guard immediately', () => {
    const g = createLeaveGuard()
    g.selected(4)
    expect(g.filter(1)).toBe(1)
    expect(g.filter(4)).toBe(4)
  })
})

describe('leave guard blockNext', () => {
  it('blocks the first slot the pointer lands on until it leaves', () => {
    const g = createLeaveGuard()
    g.blockNext()
    expect(g.filter(null)).toBeNull()
    expect(g.filter(4)).toBeNull()
    expect(g.filter(4)).toBeNull()
    expect(g.filter(2)).toBe(2)
    expect(g.filter(4)).toBe(4)
  })
})
