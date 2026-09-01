// x, y: iris centre relative to the eye corners, 0..1 across the eye. open: eyelid gap over eye width.
// lid: upper lid height above the corner line over eye width. both lid terms track vertical gaze
// far better than iris position alone
export type GazeFeatures = { x: number; y: number; open: number; lid: number }
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
// both: head pose is the primary signal and the iris adds a fine offset
export type InputMode = 'gaze' | 'head' | 'both'
export type ConfirmMode = 'dwell' | 'blink'
