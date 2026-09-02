import type { InputMode, Point } from '../types'
import { designRow, solveLeastSquares, type FitKind } from './least-squares'

// u, v come from the iris (gaze mode) or the head (head mode). a, b are head yaw and pitch,
// present only in gaze mode so small head movements do not drag the mapping
export type Features = { u: number; v: number; a?: number; b?: number }
export type Screen = { w: number; h: number }
export type CalibrationSample = { features: Features; target: Point }
export type CalibrationModel = { kind: FitKind; withHead: boolean; cx: number[]; cy: number[] }
export type Calibration = {
  model: CalibrationModel
  rmsPx: number
  diagonalFraction: number
  samples: number
  screen: Screen
}
export type Quality = 'good' | 'ok' | 'poor'

export const TARGET_INSET = 0.1
export const GOOD_DIAGONAL_FRACTION = 0.05
export const POOR_DIAGONAL_FRACTION = 0.12
const MIN_TARGETS_FOR_QUADRATIC = 6
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

const extraOf = (f: Features, withHead: boolean) => (withHead ? [f.a ?? 0, f.b ?? 0] : [])

const evaluate = (model: CalibrationModel, f: Features): Point => {
  const row = designRow(f.u, f.v, model.kind, extraOf(f, model.withHead))
  const dot = (c: number[]) => row.reduce((s, x, i) => s + x * (c[i] ?? 0), 0)
  return { x: dot(model.cx), y: dot(model.cy) }
}

export const fitCalibration = (samples: CalibrationSample[], screen: Screen): Calibration => {
  const targets = new Set(samples.map((s) => targetKey(s.target))).size
  const kind: FitKind = targets >= MIN_TARGETS_FOR_QUADRATIC ? 'quadratic' : 'linear'
  const withHead = samples.length > 0 && samples.every((s) => s.features.a !== undefined)
  const rows = samples.map((s) =>
    designRow(s.features.u, s.features.v, kind, extraOf(s.features, withHead)),
  )
  const cx = solveLeastSquares(
    rows,
    samples.map((s) => s.target.x),
  )
  const cy = solveLeastSquares(
    rows,
    samples.map((s) => s.target.y),
  )
  const model = { kind, withHead, cx, cy }
  const sq = samples.reduce((acc, s) => {
    const p = evaluate(model, s.features)
    return acc + (p.x - s.target.x) ** 2 + (p.y - s.target.y) ** 2
  }, 0)
  const rmsPx = samples.length ? Math.sqrt(sq / samples.length) : Infinity
  const diagonal = Math.hypot(screen.w, screen.h)
  return { model, rmsPx, diagonalFraction: rmsPx / diagonal, samples: samples.length, screen }
}

export const applyCalibration = (cal: Calibration, f: Features): Point => evaluate(cal.model, f)

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

export const quality = (cal: Calibration): Quality =>
  cal.diagonalFraction <= GOOD_DIAGONAL_FRACTION
    ? 'good'
    : cal.diagonalFraction <= POOR_DIAGONAL_FRACTION
      ? 'ok'
      : 'poor'

export const isPoor = (cal: Calibration): boolean => quality(cal) === 'poor'

export const serializeCalibration = (cal: Calibration): string => JSON.stringify(cal)

export const parseCalibration = (raw: string): Calibration | null => {
  try {
    const v = JSON.parse(raw) as Partial<Calibration>
    if (!v.model || !v.screen || typeof v.rmsPx !== 'number') return null
    if (typeof v.model.withHead !== 'boolean') return null
    return v as Calibration
  } catch {
    return null
  }
}

export const storageKey = (mode: InputMode, { w, h }: Screen): string => `cal:${mode}:${w}x${h}`
