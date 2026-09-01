import { describe, it, expect } from 'vitest'
import {
  fitCalibration,
  applyCalibration,
  isPoor,
  calibrationTargets,
  serializeCalibration,
  parseCalibration,
  storageKey,
  type CalibrationSample,
} from './index'

const screen = { w: 1000, h: 600 }

const synthetic = (noise = 0): CalibrationSample[] =>
  calibrationTargets(screen).flatMap((target) =>
    Array.from({ length: 10 }, (_, i) => ({
      // pretend gaze features are an affine function of screen position, with optional noise
      features: {
        u: target.x / screen.w + noise * Math.sin(i),
        v: target.y / screen.h + noise * Math.cos(i),
      },
      target,
    })),
  )

describe('calibrationTargets', () => {
  it('returns 9 points inset 10%', () => {
    const t = calibrationTargets(screen)
    expect(t).toHaveLength(9)
    expect(t[0]).toEqual({ x: 100, y: 60 })
    expect(t[8]).toEqual({ x: 900, y: 540 })
    expect(t[4]).toEqual({ x: 500, y: 300 })
  })
})

describe('fitCalibration', () => {
  it('maps features back to targets with a clean signal', () => {
    const cal = fitCalibration(synthetic(), screen)
    expect(cal.model.kind).toBe('quadratic')
    expect(cal.rmsPx).toBeLessThan(1)
    const p = applyCalibration(cal, { u: 0.5, v: 0.5 })
    expect(p.x).toBeCloseTo(500, 3)
    expect(p.y).toBeCloseTo(300, 3)
  })
  it('falls back to linear with fewer than 6 targets', () => {
    const few = synthetic().filter((s) => s.target.y === 60)
    const cal = fitCalibration(few, screen)
    expect(cal.model.kind).toBe('linear')
  })
  it('flags poor fits', () => {
    const cal = fitCalibration(synthetic(0.4), screen)
    expect(isPoor(cal)).toBe(true)
  })
  it('round-trips through json', () => {
    const cal = fitCalibration(synthetic(), screen)
    const back = parseCalibration(serializeCalibration(cal))
    expect(back).toEqual(cal)
    expect(parseCalibration('garbage')).toBeNull()
  })
  it('keys storage by mode and screen', () => {
    expect(storageKey('gaze', screen)).toBe('cal:gaze:1000x600')
  })
})
