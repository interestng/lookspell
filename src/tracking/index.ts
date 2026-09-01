import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { TrackingSample } from '../types'
import { startCamera, stopCamera } from './camera'
import { extractFeatures } from './features'

const MP_VERSION = '1.0.1'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export type Tracker = { stop(): void; video: HTMLVideoElement }
export type TrackingError = { stage: 'camera' | 'model'; cause: unknown }

const isPhone = () => Math.min(window.innerWidth, window.innerHeight) < 600

const stage = async <T>(name: TrackingError['stage'], p: Promise<T>): Promise<T> => {
  try {
    return await p
  } catch (cause) {
    throw { stage: name, cause } satisfies TrackingError
  }
}

export const startTracking = async (
  video: HTMLVideoElement,
  onSample: (s: TrackingSample) => void,
): Promise<Tracker> => {
  // more pixels on the iris helps vertical gaze most, phones stay small for frame rate
  const size = isPhone() ? { width: 640, height: 480 } : { width: 1280, height: 720 }
  const stream = await stage('camera', startCamera(video, size))
  const landmarker = await stage(
    'model',
    FilesetResolver.forVisionTasks(WASM_URL).then((vision) =>
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      }),
    ),
  )

  let running = true
  let lastVideoTime = -1
  const loop = () => {
    if (!running) return
    // detectForVideo wants a strictly increasing timestamp and a fresh frame
    if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
      lastVideoTime = video.currentTime
      const t = performance.now()
      const res = landmarker.detectForVideo(video, t)
      onSample(
        extractFeatures({
          landmarks: res.faceLandmarks[0],
          blendshapes: res.faceBlendshapes[0]?.categories,
          matrix: res.facialTransformationMatrixes[0]?.data,
          t,
        }),
      )
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  return {
    video,
    stop() {
      running = false
      landmarker.close()
      stopCamera(stream)
    },
  }
}
