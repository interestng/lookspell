import {
  calibrationTargets,
  fitRobust,
  quality,
  trimOutliers,
  type Calibration,
  type CalibrationSample,
  type Features,
} from '../../calibration'
import type { InputMode, Point, TrackingSample } from '../../types'
import type { Overlay } from '../overlay'

const SETTLE_MS = 700
const COLLECT_MS = 1300
const SWEEP_MS = 3200
const SWEEP_INSET = 0.12
// the eye reaches a moving dot a beat after the dot gets there, so a sample is paired with
// where the dot was this long ago
const PURSUIT_LAG_MS = 120
const RING_CIRC = 2 * Math.PI * 44

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const lerp = (a: number, b: number, f: number) => a + (b - a) * f
// ease in and out so the dot does not jerk at the ends of a sweep
const ease = (f: number) => (1 - Math.cos(Math.PI * f)) / 2

// gaze mode adds head yaw and pitch (cancels small head movements) and eyelid openness (vertical cue)
export const featuresOf = (s: TrackingSample, mode: InputMode): Features => {
  if (mode === 'gaze') {
    return { u: s.gaze.x, v: s.gaze.y, a: s.head.yaw, b: s.head.pitch, c: s.gaze.open }
  }
  if (mode === 'both') {
    return { u: s.head.yaw, v: s.head.pitch, a: s.gaze.x, b: s.gaze.y, c: s.gaze.open }
  }
  return { u: s.head.yaw, v: s.head.pitch }
}

type Opts = {
  mode: InputMode
  full: boolean
  screen: { w: number; h: number }
  samples: () => TrackingSample | null
}

type Screen = {
  hint: HTMLElement
  count: HTMLElement
  dot: HTMLElement
  ring: SVGCircleElement
}

const mount = (overlay: Overlay, hint: string): Screen => {
  const el = overlay.show(`
    <div class="cal" aria-live="polite">
      <p class="cal-hint"><span id="cal-hint">${hint}</span> <span class="cal-count" id="cal-count"></span></p>
      <div class="cal-dot" id="cal-dot"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="cal-ring" id="cal-ring" cx="50" cy="50" r="44"/></svg></div>
    </div>`)
  const q = <T extends Element>(sel: string) => {
    const n = el.querySelector<T>(sel)
    if (!n) throw new Error(`calibration markup missing ${sel}`)
    return n
  }
  return {
    hint: q('#cal-hint'),
    count: q('#cal-count'),
    dot: q('#cal-dot'),
    ring: q('#cal-ring'),
  }
}

const place = (s: Screen, p: Point) => {
  s.dot.style.transform = `translate(${p.x}px, ${p.y}px)`
}

// phase one: nine fixed dots, samples taken after the eye has settled
const collectDots = async (s: Screen, opts: Opts, out: CalibrationSample[]) => {
  const targets = calibrationTargets(opts.screen)
  for (const [i, target] of targets.entries()) {
    s.count.textContent = `${i + 1} of ${targets.length}`
    place(s, target)
    s.ring.style.strokeDashoffset = String(RING_CIRC)
    await wait(SETTLE_MS)
    const start = performance.now()
    await new Promise<void>((done) => {
      const tick = () => {
        const sample = opts.samples()
        if (sample?.faceFound) out.push({ features: featuresOf(sample, opts.mode), target })
        const frac = Math.min((performance.now() - start) / COLLECT_MS, 1)
        s.ring.style.strokeDashoffset = String(RING_CIRC * (1 - frac))
        if (frac < 1) requestAnimationFrame(tick)
        else done()
      }
      requestAnimationFrame(tick)
    })
  }
}

// phase two: the dot glides along three horizontal sweeps and one vertical sweep, sampling the
// whole way, which gives the fit dense coverage between the nine dots on both axes
const collectPursuit = async (s: Screen, opts: Opts, out: CalibrationSample[]) => {
  const { w, h } = opts.screen
  const x0 = w * SWEEP_INSET
  const x1 = w * (1 - SWEEP_INSET)
  const rows = [SWEEP_INSET, 0.5, 1 - SWEEP_INSET].map((f) => f * h)
  const sweeps: { from: Point; to: Point }[] = rows.map((y, i) =>
    i % 2 === 0
      ? { from: { x: x0, y }, to: { x: x1, y } }
      : { from: { x: x1, y }, to: { x: x0, y } },
  )
  sweeps.push({
    from: { x: w / 2, y: h * (1 - SWEEP_INSET) },
    to: { x: w / 2, y: h * SWEEP_INSET },
  })
  const trail: { t: number; p: Point }[] = []
  s.ring.style.strokeDashoffset = String(RING_CIRC)
  for (const [i, sweep] of sweeps.entries()) {
    s.count.textContent = `sweep ${i + 1} of ${sweeps.length}`
    place(s, sweep.from)
    await wait(SETTLE_MS)
    const start = performance.now()
    await new Promise<void>((done) => {
      const tick = () => {
        const now = performance.now()
        const frac = Math.min((now - start) / SWEEP_MS, 1)
        const e = ease(frac)
        const p = { x: lerp(sweep.from.x, sweep.to.x, e), y: lerp(sweep.from.y, sweep.to.y, e) }
        place(s, p)
        trail.push({ t: now, p })
        const lagged = trail.find((e) => e.t >= now - PURSUIT_LAG_MS)
        const sample = opts.samples()
        if (sample?.faceFound && lagged && now - start > PURSUIT_LAG_MS) {
          out.push({ features: featuresOf(sample, opts.mode), target: lagged.p })
        }
        if (frac < 1) requestAnimationFrame(tick)
        else done()
      }
      requestAnimationFrame(tick)
    })
  }
}

export const runCalibration = async (overlay: Overlay, opts: Opts): Promise<Calibration> => {
  const hints: Record<InputMode, string> = {
    gaze: 'Keep your head still and follow the dot with your eyes only.',
    head: 'Turn your head to point your nose at the dot. Your eyes can rest.',
    both: 'Look at the dot the natural way: turn your head a little and let your eyes do the rest.',
  }
  const hint = hints[opts.mode]
  const s = mount(overlay, hint)
  const dots: CalibrationSample[] = []
  const pursuit: CalibrationSample[] = []
  await collectDots(s, opts, dots)
  if (opts.full) {
    s.hint.textContent = 'Now follow the dot as it moves. Stay with it, do not jump ahead.'
    await collectPursuit(s, opts, pursuit)
  }
  overlay.hide()
  return fitRobust([...trimOutliers(dots), ...pursuit], opts.screen)
}

const WORDS = {
  good: 'Good. The pointer should land close to where you look.',
  ok: 'Usable. Expect to miss a zone now and then. Redo it if you moved during it.',
  poor: 'Poor. The pointer will wander. Sit still, face the light, and redo it.',
}

// cal is null when no face was seen at all during calibration
export const showCalibrationResult = (
  overlay: Overlay,
  cal: Calibration | null,
  onUse: () => void,
  onRedo: () => void,
) => {
  if (!cal) {
    const el = overlay.show(`
      <div class="sheet">
        <h1>No face seen.</h1>
        <p>The camera did not find a face during calibration. Check the preview in the corner: your whole face should be visible and lit from the front.</p>
        <p><button class="big-button gz" type="button" id="redo">Try again</button></p>
      </div>`)
    el.querySelector('#redo')?.addEventListener('click', onRedo, { once: true })
    return
  }
  const q = quality(cal)
  const pct = Math.round(cal.diagonalFraction * 100)
  const el = overlay.show(`
    <div class="sheet">
      <h1>Calibration: ${q}</h1>
      <p>${WORDS[q]}</p>
      <p class="fine">Average miss ${pct}% of the screen diagonal over ${cal.samples} samples. Under 5% is good, over 12% is poor.</p>
      <div class="row">
        <button class="big-button gz" type="button" id="use">${q === 'poor' ? 'Use it anyway' : 'Start'}</button>
        <button class="big-button gz" type="button" id="redo">Redo</button>
      </div>
      <p class="fine">Look at a button to choose it.</p>
    </div>`)
  el.querySelector('#use')?.addEventListener('click', onUse, { once: true })
  el.querySelector('#redo')?.addEventListener('click', onRedo, { once: true })
}
