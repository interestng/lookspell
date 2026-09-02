import type { InputMode, Point } from '../types'
import { designRow, solveLeastSquares, type FitKind } from './least-squares'

// u, v come from the iris (gaze mode) or the head (head mode). a, b are head yaw and pitch and c is
// eyelid openness, present only in gaze mode: head terms cancel small head movements and the lid
// term carries most of the vertical gaze signal
export type Features = { u: number; v: number; a?: number; b?: number; c?: number; d?: number }
export type Screen = { w: number; h: number }
export type CalibrationSample = { features: Features; target: Point }
// mu and sigma standardise each design column (intercept excluded) so ridge treats them equally.
// lo and hi clamp raw features to the calibrated range so the polynomial never extrapolates far
export type CalibrationModel = {
  kind: FitKind
  extras: number
  mu: number[]
  sigma: number[]
  lo: number[]
  hi: number[]
  cx: number[]
  cy: number[]
}
export type Calibration = {
  model: CalibrationModel
  rmsPx: number
  diagonalFraction: number
  samples: number
  // mean miss on held-out targets over the screen diagonal, the honest accuracy number
  validationFraction?: number
  screen: Screen
}
export type Quality = 'good' | 'ok' | 'poor'

export const TARGET_INSET = 0.1
export const GOOD_DIAGONAL_FRACTION = 0.05
export const POOR_DIAGONAL_FRACTION = 0.12
const MIN_TARGETS_FOR_QUADRATIC = 6
// ridge strength per sample on standardised columns, small enough not to bias a clean fit
const RIDGE_PER_SAMPLE = 1e-3
const CLAMP_MARGIN = 0.1
const OUTLIER_K = 3
const OUTLIER_FLOOR = 0.02

export const calibrationTargets = ({ w, h }: Screen): Point[] => {
  const xs = [TARGET_INSET, 0.5, 1 - TARGET_INSET].map((f) => f * w)
  const ys = [TARGET_INSET, 0.5, 1 - TARGET_INSET].map((f) => f * h)
  return ys.flatMap((y) => xs.map((x) => ({ x, y })))
}

const targetKey = (p: Point) => `${p.x},${p.y}`

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2
}

// per target: distance of each sample from the target's median features, drop anything beyond
// k times the median absolute deviation (with a floor so tight clusters are not over-trimmed)
export const trimOutliers = (samples: CalibrationSample[], k = OUTLIER_K): CalibrationSample[] => {
  const groups = new Map<string, CalibrationSample[]>()
  for (const s of samples) {
    const key = targetKey(s.target)
    groups.set(key, [...(groups.get(key) ?? []), s])
  }
  const keep: CalibrationSample[] = []
  for (const g of groups.values()) {
    const mu = median(g.map((s) => s.features.u))
    const mv = median(g.map((s) => s.features.v))
    const d = g.map((s) => Math.hypot(s.features.u - mu, s.features.v - mv))
    const threshold = Math.max(k * median(d), OUTLIER_FLOOR)
    g.forEach((s, i) => {
      if ((d[i] ?? 0) <= threshold) keep.push(s)
    })
  }
  return keep
}

const extraOf = (f: Features, extras: number) =>
  [f.a ?? 0, f.b ?? 0, f.c ?? 0, f.d ?? 0].slice(0, extras)

const extrasIn = (f: Features) =>
  f.a === undefined ? 0 : f.c === undefined ? 2 : f.d === undefined ? 3 : 4

const rawOf = (f: Features, extras: number) => [f.u, f.v, ...extraOf(f, extras)]

const clampFeatures = (f: Features, m: CalibrationModel): Features => {
  const raw = rawOf(f, m.extras).map((x, i) => {
    const lo = m.lo[i]
    const hi = m.hi[i]
    if (lo === undefined || hi === undefined) return x
    const pad = (hi - lo) * CLAMP_MARGIN
    return Math.min(Math.max(x, lo - pad), hi + pad)
  })
  const [u = f.u, v = f.v, a, b, c, d] = raw
  return { u, v, a, b, c, d }
}

const standardise = (row: number[], m: CalibrationModel) =>
  row.map((x, i) => (i === 0 ? x : (x - (m.mu[i] ?? 0)) / (m.sigma[i] || 1)))

const evaluate = (model: CalibrationModel, f: Features): Point => {
  const g = clampFeatures(f, model)
  const row = standardise(designRow(g.u, g.v, model.kind, extraOf(g, model.extras)), model)
  const dot = (c: number[]) => row.reduce((s, x, i) => s + x * (c[i] ?? 0), 0)
  return { x: dot(model.cx), y: dot(model.cy) }
}

const columnStats = (rows: number[][]) => {
  const n = rows[0]?.length ?? 0
  const mu = Array.from(
    { length: n },
    (_, i) => rows.reduce((s, r) => s + (r[i] ?? 0), 0) / rows.length,
  )
  const sigma = Array.from({ length: n }, (_, i) =>
    Math.sqrt(rows.reduce((s, r) => s + ((r[i] ?? 0) - (mu[i] ?? 0)) ** 2, 0) / rows.length),
  )
  return { mu, sigma }
}

export const fitCalibration = (samples: CalibrationSample[], screen: Screen): Calibration => {
  const targets = new Set(samples.map((s) => targetKey(s.target))).size
  const kind: FitKind = targets >= MIN_TARGETS_FOR_QUADRATIC ? 'quadratic' : 'linear'
  const extras = samples.length ? Math.min(...samples.map((s) => extrasIn(s.features))) : 0
  const raws = samples.map((s) => rawOf(s.features, extras))
  const width = raws[0]?.length ?? 0
  const lo = Array.from({ length: width }, (_, i) => Math.min(...raws.map((r) => r[i] ?? 0)))
  const hi = Array.from({ length: width }, (_, i) => Math.max(...raws.map((r) => r[i] ?? 0)))
  const plainRows = samples.map((s) =>
    designRow(s.features.u, s.features.v, kind, extraOf(s.features, extras)),
  )
  const { mu, sigma } = columnStats(plainRows)
  const base: CalibrationModel = { kind, extras, mu, sigma, lo, hi, cx: [], cy: [] }
  const rows = plainRows.map((r) => standardise(r, base))
  const ridge = RIDGE_PER_SAMPLE * samples.length
  const cx = solveLeastSquares(
    rows,
    samples.map((s) => s.target.x),
    ridge,
  )
  const cy = solveLeastSquares(
    rows,
    samples.map((s) => s.target.y),
    ridge,
  )
  const model = { ...base, cx, cy }
  const sq = samples.reduce((acc, s) => {
    const p = evaluate(model, s.features)
    return acc + (p.x - s.target.x) ** 2 + (p.y - s.target.y) ** 2
  }, 0)
  const rmsPx = samples.length ? Math.sqrt(sq / samples.length) : Infinity
  const diagonal = Math.hypot(screen.w, screen.h)
  return { model, rmsPx, diagonalFraction: rmsPx / diagonal, samples: samples.length, screen }
}

export const applyCalibration = (cal: Calibration, f: Features): Point => evaluate(cal.model, f)

// no samples, a singular solve (all zeros) or a non-finite residual: nothing usable came out
export const isDegenerate = (cal: Calibration): boolean =>
  cal.samples === 0 ||
  !Number.isFinite(cal.rmsPx) ||
  cal.model.cx.every((c) => c === 0) ||
  cal.model.cy.every((c) => c === 0)

const ROBUST_K = 2.5
const ROBUST_MIN_KEEP = 0.5

// fit, drop samples whose residual is far above the rms, fit again. catches blinks and glances
// during the pursuit phase, where every target is unique and per-target trimming cannot help
export const fitRobust = (samples: CalibrationSample[], screen: Screen): Calibration => {
  const first = fitCalibration(samples, screen)
  if (!Number.isFinite(first.rmsPx) || first.rmsPx === 0) return first
  const keep = samples.filter((s) => {
    const p = evaluate(first.model, s.features)
    return Math.hypot(p.x - s.target.x, p.y - s.target.y) <= ROBUST_K * first.rmsPx
  })
  if (keep.length === samples.length || keep.length < samples.length * ROBUST_MIN_KEEP) return first
  return fitCalibration(keep, screen)
}

export const missFraction = (cal: Calibration): number =>
  cal.validationFraction ?? cal.diagonalFraction

export const quality = (cal: Calibration): Quality => {
  const f = missFraction(cal)
  return f <= GOOD_DIAGONAL_FRACTION ? 'good' : f <= POOR_DIAGONAL_FRACTION ? 'ok' : 'poor'
}

// predicted point per held-out target is the median over its frames, so one blink does not count
export const validate = (cal: Calibration, held: CalibrationSample[]) => {
  const groups = new Map<string, CalibrationSample[]>()
  for (const s of held)
    groups.set(targetKey(s.target), [...(groups.get(targetKey(s.target)) ?? []), s])
  const misses = [...groups.values()].map((g) => {
    const preds = g.map((s) => evaluate(cal.model, s.features))
    const px = median(preds.map((p) => p.x))
    const py = median(preds.map((p) => p.y))
    const t = g[0]?.target ?? { x: 0, y: 0 }
    return Math.hypot(px - t.x, py - t.y)
  })
  const meanPx = misses.length ? misses.reduce((a, b) => a + b, 0) / misses.length : Infinity
  return { meanPx, fraction: meanPx / Math.hypot(cal.screen.w, cal.screen.h) }
}

// the last n features all lie within spread of each other on both axes
export const isSettled = (recent: Features[], n: number, spread: number): boolean => {
  if (recent.length < n) return false
  const w = recent.slice(-n)
  const range = (xs: number[]) => Math.max(...xs) - Math.min(...xs)
  return range(w.map((f) => f.u)) <= spread && range(w.map((f) => f.v)) <= spread
}

export const isPoor = (cal: Calibration): boolean => quality(cal) === 'poor'

export const serializeCalibration = (cal: Calibration): string => JSON.stringify(cal)

export const parseCalibration = (raw: string): Calibration | null => {
  try {
    const v = JSON.parse(raw) as Partial<Calibration>
    if (!v.model || !v.screen || typeof v.rmsPx !== 'number') return null
    if (typeof v.model.extras !== 'number' || !Array.isArray(v.model.mu)) return null
    return v as Calibration
  } catch {
    return null
  }
}

export const storageKey = (mode: InputMode, { w, h }: Screen): string => `cal:${mode}:${w}x${h}`
