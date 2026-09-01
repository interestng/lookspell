import { describe, it, expect } from 'vitest'
import { extractFeatures, IRIS, EYE } from './features'

const blank = () => Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }))

const withEyes = (irisFracX: number, irisFracY: number) => {
  const lm = blank()
  const setEye = (
    eye: { outer: number; inner: number; top: number; bottom: number },
    iris: number[],
    x0: number,
  ) => {
    lm[eye.outer] = { x: x0, y: 0.5, z: 0 }
    lm[eye.inner] = { x: x0 + 0.1, y: 0.5, z: 0 }
    lm[eye.top] = { x: x0 + 0.05, y: 0.45, z: 0 }
    lm[eye.bottom] = { x: x0 + 0.05, y: 0.55, z: 0 }
    for (const i of iris) lm[i] = { x: x0 + 0.1 * irisFracX, y: 0.45 + 0.1 * irisFracY, z: 0 }
  }
  setEye(EYE.right, IRIS.right, 0.3)
  setEye(EYE.left, IRIS.left, 0.6)
  return lm
}

describe('extractFeatures', () => {
  it('reports no face when landmarks missing', () => {
    const s = extractFeatures({
      landmarks: undefined,
      blendshapes: undefined,
      matrix: undefined,
      t: 5,
    })
    expect(s.faceFound).toBe(false)
    expect(s.t).toBe(5)
  })
  it('normalises iris position inside the eye box', () => {
    const s = extractFeatures({
      landmarks: withEyes(0.25, 0.75),
      blendshapes: undefined,
      matrix: undefined,
      t: 0,
    })
    expect(s.faceFound).toBe(true)
    expect(s.gaze.x).toBeCloseTo(0.25)
    expect(s.gaze.y).toBeCloseTo(0.75)
  })
  it('reads blink scores', () => {
    const s = extractFeatures({
      landmarks: withEyes(0.5, 0.5),
      blendshapes: [
        { categoryName: 'eyeBlinkLeft', score: 0.8 },
        { categoryName: 'eyeBlinkRight', score: 0.7 },
      ],
      matrix: undefined,
      t: 0,
    })
    expect(s.blink).toEqual({ left: 0.8, right: 0.7 })
  })
  it('reads yaw and pitch from a rotation matrix', () => {
    const yaw = 0.3
    // column-major 4x4, rotation about y by yaw
    const c = Math.cos(yaw)
    const s = Math.sin(yaw)
    const m = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]
    const out = extractFeatures({
      landmarks: withEyes(0.5, 0.5),
      blendshapes: undefined,
      matrix: m,
      t: 0,
    })
    expect(out.head.yaw).toBeCloseTo(yaw, 5)
    expect(out.head.pitch).toBeCloseTo(0, 5)
  })
})
