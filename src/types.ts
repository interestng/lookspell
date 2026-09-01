export type GazeFeatures = { x: number; y: number }
export type HeadFeatures = { yaw: number; pitch: number }
export type BlinkFeatures = { left: number; right: number }

export type TrackingSample = {
  t: number
  faceFound: boolean
  gaze: GazeFeatures
  head: HeadFeatures
  blink: BlinkFeatures
}

export type Point = { x: number; y: number }
export type PointerState = Point & { confident: boolean }
export type InputMode = 'gaze' | 'head'
export type ConfirmMode = 'dwell' | 'blink'
