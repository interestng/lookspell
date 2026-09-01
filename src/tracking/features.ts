import type { TrackingSample } from '../types'

export type Landmark = { x: number; y: number; z: number }
export type RawResult = {
  landmarks: Landmark[] | undefined
  blendshapes: { categoryName: string; score: number }[] | undefined
  matrix: ArrayLike<number> | undefined
  t: number
}

// mediapipe face mesh indices. "right" is the subject's right eye, which appears on the image left
export const IRIS = { right: [468, 469, 470, 471, 472], left: [473, 474, 475, 476, 477] }
export const EYE = {
  right: { outer: 33, inner: 133, top: 159, bottom: 145 },
  left: { outer: 263, inner: 362, top: 386, bottom: 374 },
}

const NO_FACE: TrackingSample = {
  t: 0,
  faceFound: false,
  gaze: { x: 0.5, y: 0.5 },
  head: { yaw: 0, pitch: 0 },
  blink: { left: 0, right: 0 },
}

const eyeFeature = (lm: Landmark[], eye: typeof EYE.right, iris: number[]) => {
  const box = [eye.outer, eye.inner, eye.top, eye.bottom].flatMap((i) => lm[i] ?? [])
  const irisPts = iris.flatMap((i) => lm[i] ?? [])
  if (box.length < 4 || !irisPts.length) return null
  const minX = Math.min(...box.map((p) => p.x))
  const maxX = Math.max(...box.map((p) => p.x))
  const minY = Math.min(...box.map((p) => p.y))
  const maxY = Math.max(...box.map((p) => p.y))
  if (maxX === minX || maxY === minY) return null
  const cx = irisPts.reduce((s, p) => s + p.x, 0) / irisPts.length
  const cy = irisPts.reduce((s, p) => s + p.y, 0) / irisPts.length
  return { x: (cx - minX) / (maxX - minX), y: (cy - minY) / (maxY - minY) }
}

// column-major 4x4: element (row, col) sits at data[col * 4 + row]
const headPose = (m: ArrayLike<number> | undefined) => {
  if (!m || m.length < 16) return { yaw: 0, pitch: 0 }
  const r = (row: number, col: number) => m[col * 4 + row] ?? 0
  return {
    yaw: Math.atan2(-r(2, 0), Math.hypot(r(2, 1), r(2, 2))),
    pitch: Math.atan2(r(2, 1), r(2, 2)),
  }
}

export const extractFeatures = ({
  landmarks,
  blendshapes,
  matrix,
  t,
}: RawResult): TrackingSample => {
  if (!landmarks || landmarks.length < 478) return { ...NO_FACE, t }
  const eyes = [
    eyeFeature(landmarks, EYE.right, IRIS.right),
    eyeFeature(landmarks, EYE.left, IRIS.left),
  ]
  const both = eyes.flatMap((e) => e ?? [])
  if (!both.length) return { ...NO_FACE, t }
  const score = (name: string) => blendshapes?.find((b) => b.categoryName === name)?.score ?? 0
  return {
    t,
    faceFound: true,
    gaze: {
      x: both.reduce((s, e) => s + e.x, 0) / both.length,
      y: both.reduce((s, e) => s + e.y, 0) / both.length,
    },
    head: headPose(matrix),
    blink: { left: score('eyeBlinkLeft'), right: score('eyeBlinkRight') },
  }
}
