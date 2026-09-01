import type { InputMode, Point } from '../types'
import { designRow, solveLeastSquares, type FitKind } from './least-squares'

export type Features = { u: number; v: number }
export type Screen = { w: number; h: number }
export type CalibrationSample = { features: Features; target: Point }
export type CalibrationModel = { kind: FitKind; cx: number[]; cy: number[] }
export type Calibration = {
  model: CalibrationModel
  rmsPx: number
  diagonalFraction: number
  screen: Screen
}

export const TARGET_INSET = 0.1
export const POOR_DIAGONAL_FRACTION = 0.12
const MIN_TARGETS_FOR_QUADRATIC = 6

export const calibrationTargets = ({ w, h }: Screen): Point[] => {
  const xs = [TARGET_INSET, 0.5, 1 - TARGET_INSET].map((f) => f * w)
  const ys = [TARGET_INSET, 0.5, 1 - TARGET_INSET].map((f) => f * h)
  return ys.flatMap((y) => xs.map((x) => ({ x, y })))
}

const distinctTargets = (samples: CalibrationSample[]): number =>
  new Set(samples.map((s) => `${s.target.x},${s.target.y}`)).size

const evaluate = (model: CalibrationModel, f: Features): Point => {
  const row = designRow(f.u, f.v, model.kind)
  const dot = (c: number[]) => row.reduce((s, x, i) => s + x * (c[i] ?? 0), 0)
  return { x: dot(model.cx), y: dot(model.cy) }
}

export const fitCalibration = (samples: CalibrationSample[], screen: Screen): Calibration => {
  const kind: FitKind =
    distinctTargets(samples) >= MIN_TARGETS_FOR_QUADRATIC ? 'quadratic' : 'linear'
  const rows = samples.map((s) => designRow(s.features.u, s.features.v, kind))
  const cx = solveLeastSquares(
    rows,
    samples.map((s) => s.target.x),
  )
  const cy = solveLeastSquares(
    rows,
    samples.map((s) => s.target.y),
  )
  const model = { kind, cx, cy }
  const sq = samples.reduce((acc, s) => {
    const p = evaluate(model, s.features)
    return acc + (p.x - s.target.x) ** 2 + (p.y - s.target.y) ** 2
  }, 0)
  const rmsPx = samples.length ? Math.sqrt(sq / samples.length) : Infinity
  const diagonal = Math.hypot(screen.w, screen.h)
  return { model, rmsPx, diagonalFraction: rmsPx / diagonal, screen }
}

export const applyCalibration = (cal: Calibration, f: Features): Point => evaluate(cal.model, f)

export const isPoor = (cal: Calibration): boolean => cal.diagonalFraction > POOR_DIAGONAL_FRACTION

export const serializeCalibration = (cal: Calibration): string => JSON.stringify(cal)

export const parseCalibration = (raw: string): Calibration | null => {
  try {
    const v = JSON.parse(raw) as Partial<Calibration>
    if (!v.model || !v.screen || typeof v.rmsPx !== 'number') return null
    return v as Calibration
  } catch {
    return null
  }
}

export const storageKey = (mode: InputMode, { w, h }: Screen): string => `cal:${mode}:${w}x${h}`
