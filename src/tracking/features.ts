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
  gaze: { x: 0.5, y: 0.5, open: 0 },
  head: { yaw: 0, pitch: 0 },
  blink: { left: 0, right: 0 },
}

// iris centre measured along and across the line between the eye corners. corners stay put when
// the lids move, so this is stable where a lid-based box is not. open is the lid gap over eye width
const eyeFeature = (lm: Landmark[], eye: typeof EYE.right, iris: number[]) => {
  const outer = lm[eye.outer]
  const inner = lm[eye.inner]
  const top = lm[eye.top]
  const bottom = lm[eye.bottom]
  const irisPts = iris.flatMap((i) => lm[i] ?? [])
  if (!outer || !inner || !top || !bottom || !irisPts.length) return null
  const ax = inner.x - outer.x
  const ay = inner.y - outer.y
  const w = Math.hypot(ax, ay)
  if (w === 0) return null
  const mx = (outer.x + inner.x) / 2
  const my = (outer.y + inner.y) / 2
  const cx = irisPts.reduce((s, p) => s + p.x, 0) / irisPts.length - mx
  const cy = irisPts.reduce((s, p) => s + p.y, 0) / irisPts.length - my
  // unit vectors along the corner line and perpendicular to it (perpendicular points down in image space)
  const ux = ax / w
  const uy = ay / w
  return {
    x: (cx * ux + cy * uy) / w + 0.5,
    y: (-cx * uy + cy * ux) / w + 0.5,
    open: Math.hypot(bottom.x - top.x, bottom.y - top.y) / w,
  }
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
      open: both.reduce((s, e) => s + e.open, 0) / both.length,
    },
    head: headPose(matrix),
    blink: { left: score('eyeBlinkLeft'), right: score('eyeBlinkRight') },
  }
}
