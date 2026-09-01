import {
  calibrationTargets,
  fitCalibration,
  type Calibration,
  type CalibrationSample,
  type Features,
} from '../../calibration'
import type { InputMode, TrackingSample } from '../../types'

const SETTLE_MS = 500
const COLLECT_MS = 1000

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const featuresOf = (s: TrackingSample, mode: InputMode): Features =>
  mode === 'gaze' ? { u: s.gaze.x, v: s.gaze.y } : { u: s.head.yaw, v: s.head.pitch }

type Opts = {
  mode: InputMode
  screen: { w: number; h: number }
  samples: () => TrackingSample | null
}

export const runCalibration = async (overlay: HTMLElement, opts: Opts): Promise<Calibration> => {
  overlay.hidden = false
  overlay.innerHTML = `<div class="cal"><p class="cal-hint">follow the dot with your ${
    opts.mode === 'gaze' ? 'eyes only' : 'head'
  }, keep the rest still</p><div class="cal-dot" id="cal-dot"></div></div>`
  const dot = overlay.querySelector<HTMLElement>('#cal-dot')
  if (!dot) throw new Error('calibration dot missing')
  const collected: CalibrationSample[] = []

  for (const target of calibrationTargets(opts.screen)) {
    dot.style.transform = `translate(${target.x}px, ${target.y}px)`
    await wait(SETTLE_MS)
    const until = performance.now() + COLLECT_MS
    await new Promise<void>((done) => {
      const tick = () => {
        const s = opts.samples()
        if (s?.faceFound) collected.push({ features: featuresOf(s, opts.mode), target })
        if (performance.now() < until) requestAnimationFrame(tick)
        else done()
      }
      requestAnimationFrame(tick)
    })
  }
  overlay.hidden = true
  overlay.innerHTML = ''
  return fitCalibration(collected, opts.screen)
}
