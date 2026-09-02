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

describe('head terms and outliers', () => {
  it('uses extra head features when present', async () => {
    const { fitCalibration: fit, applyCalibration: applyC } = await import('./index')
    // screen x depends on iris u and on head yaw a, y on v and pitch b
    const samples = calibrationTargets(screen).flatMap((target) =>
      Array.from({ length: 12 }, (_, i) => {
        const a = ((i % 4) - 1.5) * 0.1
        const b = ((i % 3) - 1) * 0.1
        return {
          features: { u: target.x / screen.w - a, v: target.y / screen.h - b, a, b },
          target,
        }
      }),
    )
    const cal = fit(samples, screen)
    expect(cal.rmsPx).toBeLessThan(1)
    const p = applyC(cal, { u: 0.5 - 0.1, v: 0.5, a: 0.1, b: 0 })
    expect(p.x).toBeCloseTo(500, 2)
  })
  it('trimOutliers drops samples far from the target median', async () => {
    const { trimOutliers } = await import('./index')
    const good = synthetic()
    const bad = { features: { u: 5, v: 5 }, target: good[0]!.target }
    const trimmed = trimOutliers([...good, bad])
    expect(trimmed).toHaveLength(good.length)
    expect(trimmed).not.toContain(bad)
  })
  it('trimOutliers keeps everything when samples agree', async () => {
    const { trimOutliers } = await import('./index')
    const good = synthetic()
    expect(trimOutliers(good)).toHaveLength(good.length)
  })
})

describe('fitRobust', () => {
  it('refits without samples whose residual is far above the rest', async () => {
    const { fitRobust, fitCalibration: fit } = await import('./index')
    const good = synthetic(0.01)
    // pursuit-style samples have unique targets, so per-target trimming cannot catch these
    const bad = Array.from({ length: 6 }, (_, i) => ({
      features: { u: 0.9, v: 0.9 },
      target: { x: 50 + i, y: 50 + i },
    }))
    const naive = fit([...good, ...bad], screen)
    const robust = fitRobust([...good, ...bad], screen)
    expect(robust.rmsPx).toBeLessThan(naive.rmsPx / 2)
    expect(robust.samples).toBe(good.length)
  })
  it('returns the plain fit when nothing stands out', async () => {
    const { fitRobust, fitCalibration: fit } = await import('./index')
    const s = synthetic(0.01)
    expect(fitRobust(s, screen).samples).toBe(fit(s, screen).samples)
  })
})
