import { describe, it, expect } from 'vitest'
import { createOneEuro } from './one-euro'

describe('one euro filter', () => {
  it('returns the first sample unchanged', () => {
    const f = createOneEuro()
    expect(f.filter(10, 0)).toBe(10)
  })
  it('suppresses jitter at rest', () => {
    const f = createOneEuro()
    let out = 0
    for (let i = 0; i < 200; i++) out = f.filter(100 + (i % 2 ? 2 : -2), i * 16)
    expect(Math.abs(out - 100)).toBeLessThan(1)
  })
  it('follows a fast step within a few frames', () => {
    const f = createOneEuro()
    for (let i = 0; i < 20; i++) f.filter(0, i * 16)
    let out = 0
    for (let i = 20; i < 35; i++) out = f.filter(500, i * 16)
    expect(out).toBeGreaterThan(450)
  })
})
