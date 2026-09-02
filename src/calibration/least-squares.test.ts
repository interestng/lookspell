import { describe, it, expect } from 'vitest'
import { designRow, solveLeastSquares } from './least-squares'

describe('designRow', () => {
  it('builds quadratic terms', () => {
    expect(designRow(2, 3, 'quadratic')).toEqual([1, 2, 3, 6, 4, 9])
  })
  it('builds linear terms', () => {
    expect(designRow(2, 3, 'linear')).toEqual([1, 2, 3])
  })
})

describe('solveLeastSquares', () => {
  it('recovers coefficients of a known quadratic', () => {
    const truth = [5, 2, -1, 0.5, 0.25, -0.75]
    const rows: number[][] = []
    const ys: number[] = []
    for (let u = 0; u <= 1; u += 0.1) {
      for (let v = 0; v <= 1; v += 0.1) {
        const r = designRow(u, v, 'quadratic')
        rows.push(r)
        ys.push(r.reduce((s, x, i) => s + x * (truth[i] ?? 0), 0))
      }
    }
    const c = solveLeastSquares(rows, ys)
    c.forEach((x, i) => expect(x).toBeCloseTo(truth[i] ?? 0, 6))
  })
  it('returns zeros for a singular system instead of throwing', () => {
    const rows = [
      [1, 0, 0],
      [1, 0, 0],
    ]
    const c = solveLeastSquares(rows, [1, 1])
    expect(c.length).toBe(3)
    expect(c.every(Number.isFinite)).toBe(true)
  })
})

describe('ridge', () => {
  it('returns a finite, sane solution when two columns are identical', () => {
    const rows: number[][] = []
    const ys: number[] = []
    for (let u = 0; u <= 1; u += 0.1) {
      rows.push([1, u, u])
      ys.push(3 + 2 * u)
    }
    const plain = solveLeastSquares(rows, ys)
    const ridged = solveLeastSquares(rows, ys, 0.01)
    expect(plain.every((c) => c === 0)).toBe(true)
    expect(ridged.every(Number.isFinite)).toBe(true)
    const at = (c: number[], u: number) => (c[0] ?? 0) + (c[1] ?? 0) * u + (c[2] ?? 0) * u
    expect(at(ridged, 0.5)).toBeCloseTo(4, 1)
  })
})
