import {
  calibrationTargets,
  fitRobust,
  isDegenerate,
  isSettled,
  missFraction,
  quality,
  trimOutliers,
  validate,
  GOOD_DIAGONAL_FRACTION,
  type Calibration,
  type CalibrationSample,
  type Features,
} from '../../calibration'
import type { InputMode, Point, TrackingSample } from '../../types'
import type { Overlay } from '../overlay'

const SETTLE_MS = 600
const SETTLE_TIMEOUT_MS = 1600
const SETTLE_FRAMES = 6
const SETTLE_SPREAD = 0.015
const COLLECT_MS = 1200
const SWEEP_MS = 3200
const SWEEP_INSET = 0.12
// the eye reaches a moving dot a beat after the dot gets there, so a sample is paired with
// where the dot was this long ago
const PURSUIT_LAG_MS = 120
const CARD_MS = 2600
const MAX_CHECK_ROUNDS = 2
const RING_CIRC = 2 * Math.PI * 44

// held-out dots sit between the training dots so the check measures interpolation, not recall
const CHECK_SETS: Point[][] = [
  [
    { x: 0.3, y: 0.3 },
    { x: 0.7, y: 0.3 },
    { x: 0.3, y: 0.7 },
    { x: 0.7, y: 0.7 },
  ],
  [
    { x: 0.5, y: 0.25 },
    { x: 0.25, y: 0.5 },
    { x: 0.75, y: 0.5 },
    { x: 0.5, y: 0.75 },
  ],
]

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const lerp = (a: number, b: number, f: number) => a + (b - a) * f
// ease in and out so the dot does not jerk at the ends of a sweep
const ease = (f: number) => (1 - Math.cos(Math.PI * f)) / 2

const BLINK_SCORE = 0.35

// a frame is usable for calibration when a face is seen and neither eye is mid-blink
export const usable = (s: TrackingSample | null): s is TrackingSample =>
  !!s?.faceFound && s.blink.left < BLINK_SCORE && s.blink.right < BLINK_SCORE

export const featuresOf = (s: TrackingSample, mode: InputMode): Features => {
  if (mode === 'gaze') {
    return {
      u: s.gaze.x,
      v: s.gaze.y,
      a: s.head.yaw,
      b: s.head.pitch,
      c: s.gaze.open,
      d: s.gaze.lid,
    }
  }
  if (mode === 'both') {
    return {
      u: s.head.yaw,
      v: s.head.pitch,
      a: s.gaze.x,
      b: s.gaze.y,
      c: s.gaze.open,
      d: s.gaze.lid,
    }
  }
  return { u: s.head.yaw, v: s.head.pitch }
}

type Opts = {
  mode: InputMode
  full: boolean
  screen: { w: number; h: number }
  samples: () => TrackingSample | null
}

type Stage = { root: HTMLElement; card: HTMLElement; dot: HTMLElement; ring: SVGCircleElement }

// a bare stage: nothing on screen but the dot, so nothing competes with it for the eye
const mount = (overlay: Overlay): Stage => {
  const root = overlay.show(`
    <div class="cal" aria-live="polite">
      <div class="cal-card" id="cal-card" hidden><h2 id="cal-title"></h2><p id="cal-body"></p></div>
      <div class="cal-dot" id="cal-dot" hidden><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="cal-ring" id="cal-ring" cx="50" cy="50" r="44"/></svg></div>
    </div>`)
  const card = root.querySelector<HTMLElement>('#cal-card')
  const dot = root.querySelector<HTMLElement>('#cal-dot')
  const ring = root.querySelector<SVGCircleElement>('#cal-ring')
  if (!card || !dot || !ring) throw new Error('calibration markup missing')
  return { root, card, dot, ring }
}

const place = (s: Stage, p: Point) => {
  s.dot.style.transform = `translate(${p.x}px, ${p.y}px)`
}

const setRing = (s: Stage, frac: number) => {
  s.ring.style.strokeDashoffset = String(RING_CIRC * (1 - frac))
}

// a short instruction card between phases, shown while the dot is hidden
const showCard = async (s: Stage, title: string, body: string) => {
  s.dot.hidden = true
  const h = s.card.querySelector('#cal-title')
  const p = s.card.querySelector('#cal-body')
  if (h) h.textContent = title
  if (p) p.textContent = body
  s.card.hidden = false
  await wait(CARD_MS)
  s.card.hidden = true
  s.dot.hidden = false
}

// hold the dot until the features stop moving (the eye has arrived) or a timeout passes
const waitSettled = async (opts: Opts) => {
  const start = performance.now()
  const recent: Features[] = []
  await wait(SETTLE_MS)
  await new Promise<void>((done) => {
    const tick = () => {
      const s = opts.samples()
      if (usable(s)) recent.push(featuresOf(s, opts.mode))
      const timedOut = performance.now() - start > SETTLE_TIMEOUT_MS
      if (isSettled(recent, SETTLE_FRAMES, SETTLE_SPREAD) || timedOut) done()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

const collectAt = async (s: Stage, opts: Opts, target: Point, out: CalibrationSample[]) => {
  place(s, target)
  setRing(s, 0)
  await waitSettled(opts)
  const start = performance.now()
  await new Promise<void>((done) => {
    const tick = () => {
      const sample = opts.samples()
      if (usable(sample)) out.push({ features: featuresOf(sample, opts.mode), target })
      const frac = Math.min((performance.now() - start) / COLLECT_MS, 1)
      setRing(s, frac)
      if (frac < 1) requestAnimationFrame(tick)
      else done()
    }
    requestAnimationFrame(tick)
  })
}

const collectDots = async (s: Stage, opts: Opts, targets: Point[], out: CalibrationSample[]) => {
  for (const target of targets) await collectAt(s, opts, target, out)
}

// three horizontal sweeps and one vertical, sampling the whole way for dense coverage on both axes
const collectPursuit = async (s: Stage, opts: Opts, out: CalibrationSample[]) => {
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
  setRing(s, 0)
  for (const sweep of sweeps) {
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
        const lagged = trail.find((t) => t.t >= now - PURSUIT_LAG_MS)
        const sample = opts.samples()
        if (usable(sample) && lagged && now - start > PURSUIT_LAG_MS) {
          out.push({ features: featuresOf(sample, opts.mode), target: lagged.p })
        }
        if (frac < 1) requestAnimationFrame(tick)
        else done()
      }
      requestAnimationFrame(tick)
    })
  }
}

const POINT_HINT: Record<InputMode, string> = {
  gaze: 'Keep your head still. Follow the dot with your eyes only.',
  head: 'Turn your head so your nose points at the dot. Your eyes can rest.',
  both: 'Look at the dot the natural way, turning your head a little.',
}

export const runCalibration = async (overlay: Overlay, opts: Opts): Promise<Calibration> => {
  const s = mount(overlay)
  const scale = (p: Point) => ({ x: p.x * opts.screen.w, y: p.y * opts.screen.h })
  const training: CalibrationSample[] = []
  const pursuit: CalibrationSample[] = []
  const fit = () => fitRobust([...trimOutliers(training), ...pursuit], opts.screen)

  await showCard(s, 'Follow the dot.', POINT_HINT[opts.mode])
  await collectDots(s, opts, calibrationTargets(opts.screen), training)
  if (opts.full) {
    await showCard(s, 'Now it moves.', 'Stay with the dot as it glides. Do not jump ahead of it.')
    await collectPursuit(s, opts, pursuit)
  }

  let cal = fit()
  if (isDegenerate(cal)) {
    overlay.hide()
    return cal
  }

  // check on dots the fit has never seen. if the miss is too big, learn from them and check again
  await showCard(s, 'Quick check.', 'A few more dots. Just look at each one.')
  for (let round = 0; round < MAX_CHECK_ROUNDS; round++) {
    const held: CalibrationSample[] = []
    const set = CHECK_SETS[round % CHECK_SETS.length] ?? []
    await collectDots(s, opts, set.map(scale), held)
    const v = validate(cal, trimOutliers(held))
    cal = { ...cal, validationFraction: v.fraction }
    if (v.fraction <= GOOD_DIAGONAL_FRACTION || round === MAX_CHECK_ROUNDS - 1) break
    training.push(...held)
    cal = { ...fit(), validationFraction: v.fraction }
  }
  overlay.hide()
  return cal
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
  const pct = Math.round(missFraction(cal) * 100)
  const how =
    cal.validationFraction === undefined ? 'fit error' : 'measured on dots it had not seen'
  const el = overlay.show(`
    <div class="sheet">
      <h1>Calibration: ${q}</h1>
      <p>${WORDS[q]}</p>
      <p class="fine">Miss ${pct}% of the screen diagonal, ${how}, from ${cal.samples} samples. Under 5% is good, over 12% is poor.</p>
      <div class="row">
        <button class="big-button gz" type="button" id="use">${q === 'poor' ? 'Use it anyway' : 'Start'}</button>
        <button class="big-button gz" type="button" id="redo">Redo</button>
      </div>
      <p class="fine">Look at a button to choose it.</p>
    </div>`)
  el.querySelector('#use')?.addEventListener('click', onUse, { once: true })
  el.querySelector('#redo')?.addEventListener('click', onRedo, { once: true })
}
