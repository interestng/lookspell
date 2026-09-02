export type FitKind = 'quadratic' | 'linear'

// extra terms (head yaw and pitch in gaze mode) enter linearly after the polynomial terms
export const designRow = (u: number, v: number, kind: FitKind, extra: number[] = []): number[] =>
  kind === 'quadratic' ? [1, u, v, u * v, u * u, v * v, ...extra] : [1, u, v, ...extra]

// normal equations (A^T A) c = A^T y, then gaussian elimination with partial pivoting.
// systems here are at most 8x8 so this is plenty
export const solveLeastSquares = (rows: number[][], ys: number[]): number[] => {
  const n = rows[0]?.length ?? 0
  const ata = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  const aty = new Array<number>(n).fill(0)
  rows.forEach((r, k) => {
    const y = ys[k] ?? 0
    for (let i = 0; i < n; i++) {
      const ri = r[i] ?? 0
      aty[i] = (aty[i] ?? 0) + ri * y
      const row = ata[i]
      if (!row) continue
      for (let j = 0; j < n; j++) row[j] = (row[j] ?? 0) + ri * (r[j] ?? 0)
    }
  })
  return gaussianSolve(ata, aty)
}

const gaussianSolve = (m: number[][], b: number[]): number[] => {
  const n = b.length
  const zeros = () => new Array<number>(n).fill(0)
  const a = m.map((row, i) => [...row, b[i] ?? 0])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r]?.[col] ?? 0) > Math.abs(a[pivot]?.[col] ?? 0)) pivot = r
    }
    const pr = a[pivot]
    const cr = a[col]
    if (!pr || !cr) return zeros()
    a[col] = pr
    a[pivot] = cr
    const p = pr[col] ?? 0
    if (Math.abs(p) < 1e-12) return zeros()
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const row = a[r]
      if (!row) continue
      const f = (row[col] ?? 0) / p
      for (let c = col; c <= n; c++) row[c] = (row[c] ?? 0) - f * (pr[c] ?? 0)
    }
  }
  return a.map((row, i) => (row[n] ?? 0) / (row[i] ?? 1))
}
