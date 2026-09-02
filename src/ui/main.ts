import './theme.css'
import './app.css'
import {
  apply,
  buildBoards,
  initialState,
  phraseSlots,
  resolveZones,
  stickyHit,
  zoneCountFor,
  type BoardRequest,
  type BoardSet,
  type Rect,
  type Zone,
} from '../board'
import {
  applyCalibration,
  parseCalibration,
  quality,
  serializeCalibration,
  storageKey,
  type Calibration,
} from '../calibration'
import { createPointer } from '../pointer'
import { createPredictor, currentPrefix, loadWords } from '../predict'
import { createBlinkDetector, createDwellMachine, createLeaveGuard } from '../selection'
import { createSpeaker } from '../speech'
import { createStudySession, exportFilename, sessionSummary, type StudySession } from '../study'
import { startTracking, type Tracker, type TrackingError } from '../tracking'
import type { InputMode, Point, PointerState, TrackingSample } from '../types'
import { createOverlay } from './overlay'
import { createPointerLayer } from './pointer-layer'
import { createBoardScreen } from './screens/board'
import { featuresOf, runCalibration, showCalibrationResult } from './screens/calibration'
import { showCameraError, showLargeText, showModelError } from './screens/permission'
import { showSettings } from './screens/settings'
import { showStart } from './screens/start'
import { downloadJson, showStudyForm, showStudySummary, type StudyInit } from './screens/study'
import { loadSettings, saveSettings, SMOOTHING_CUTOFF, type Settings } from './settings-store'
import { createStatus } from './status'

const FACE_LOST_MS = 1000
// eyes closed: hold the pointer where it was rather than follow the collapsing lid signal
const BLINK_SCORE = 0.35
const BLINK_HOLD_MS = 500
const LOW_LIGHT_LUMA = 40
const RESIZE_INVALIDATE = 0.1
const STICKY_MARGIN = 0.15
const LIGHT_CHECK_EVERY = 60

const byId = (id: string) => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el
}

const screenSize = () => ({ w: window.innerWidth, h: window.innerHeight })
const isDev = import.meta.env.DEV

let settings: Settings = loadSettings(localStorage)
const zoneCount = settings.zoneOverride ?? zoneCountFor(window.innerWidth, window.innerHeight)
let boards: BoardSet = buildBoards(zoneCount, settings.phrases)

const root = byId('app')
const overlay = createOverlay(byId('overlay'))
const screen = createBoardScreen(root, zoneCount)
const pointerLayer = createPointerLayer(byId('pointer'))
const status = createStatus(byId('status'))
const preview = byId('preview') as HTMLVideoElement
const speaker = createSpeaker()
const dwell = createDwellMachine({ dwellMs: settings.dwellMs })
const blink = createBlinkDetector()
const guard = createLeaveGuard()

const makePointer = () => {
  const size = screenSize()
  const diagonal = Math.hypot(size.w, size.h)
  if (settings.inputMode === 'head') return createPointer(size, { deadband: diagonal * 0.003 })
  // the iris term brings its noise along in both and gaze modes, combined mode needs less damping
  const cutoff = SMOOTHING_CUTOFF[settings.smoothing] * (settings.inputMode === 'both' ? 1.6 : 1)
  return createPointer(size, {
    minCutoff: cutoff,
    beta: 0.002,
    median: true,
    deadband: diagonal * 0.006,
  })
}

let pointer = makePointer()
let calibratedFor = screenSize()
let boardState = initialState()
let predictor = createPredictor([])
let tracker: Tracker | null = null
let latest: TrackingSample | null = null
let calibration: Calibration | null = null
// a fresh fit the user has not accepted yet, drives the pointer on the result screen only
let pendingCalibration: Calibration | null = null
let calibrating = false
let faceLostSince: number | null = null
let faceLostReported = false
let study: StudySession | null = null
let mouseMode = false
let mouse: Point = { x: -1, y: -1 }
let frameCount = 0
let blinkSince: number | null = null
let lastPointer: PointerState | null = null
let overlayWasVisible = false
let lowLight = false

loadWords(`${import.meta.env.BASE_URL}words.txt`)
  .then((w) => (predictor = createPredictor(w)))
  .catch(() => undefined)
speaker.onStateChange((on) => screen.setSpeaking(on))

const loadStoredCalibration = (mode: InputMode): Calibration | null => {
  const raw = localStorage.getItem(storageKey(mode, screenSize()))
  return raw ? parseCalibration(raw) : null
}

const applySettings = (next: Settings) => {
  const reload = next.zoneOverride !== settings.zoneOverride
  const modeChanged = next.inputMode !== settings.inputMode
  const smoothingChanged = next.smoothing !== settings.smoothing
  settings = next
  saveSettings(localStorage, settings)
  dwell.setConfig({ dwellMs: settings.dwellMs })
  speaker.setVoice(settings.voice)
  preview.hidden = !settings.showPreview
  preview.toggleAttribute('data-mirror', settings.mirror)
  boards = buildBoards(zoneCount, settings.phrases)
  if (!boards[boardState.boardId]) boardState = { ...boardState, boardId: 'home' }
  if (modeChanged) calibration = loadStoredCalibration(settings.inputMode)
  if (modeChanged || smoothingChanged) pointer = makePointer()
  if (reload) location.reload()
}

const useCalibration = (cal: Calibration, size: { w: number; h: number }) => {
  calibration = cal
  calibratedFor = size
  pointer = makePointer()
  localStorage.setItem(storageKey(settings.inputMode, size), serializeCalibration(cal))
}

// runs the dots (and pursuit) phase, then a result screen the user answers by looking.
// while the result screen is up, calibrating is false so the overlay dwell path drives it
const calibrate = async () => {
  if (calibrating) return
  calibrating = true
  pointerLayer.hide()
  const size = screenSize()
  const cal = await runCalibration(overlay, {
    mode: settings.inputMode,
    full: settings.calibration === 'full',
    screen: size,
    samples: () => latest,
  })
  calibrating = false
  guard.blockNext()
  pendingCalibration = Number.isFinite(cal.rmsPx) ? cal : null
  pointer = makePointer()
  if (!pendingCalibration) {
    showCalibrationResult(
      overlay,
      null,
      () => overlay.hide(),
      () => overlay.hide(),
    )
    return
  }
  showCalibrationResult(
    overlay,
    cal,
    () => {
      pendingCalibration = null
      useCalibration(cal, size)
      overlay.hide()
    },
    () => {
      pendingCalibration = null
      overlay.hide()
    },
  )
}

window.addEventListener('resize', () => {
  const s = screenSize()
  const moved =
    Math.abs(s.w - calibratedFor.w) / calibratedFor.w > RESIZE_INVALIDATE ||
    Math.abs(s.h - calibratedFor.h) / calibratedFor.h > RESIZE_INVALIDATE
  if (moved) calibration = null
})

const start = async () => {
  overlay.hide()
  status.set({ face: 'loading', calibration: 'none', mode: settings.inputMode })
  try {
    tracker = await startTracking(preview, (s) => (latest = s))
  } catch (e) {
    const err = e as TrackingError
    if (err.stage === 'camera') showCameraError(overlay, start)
    else showModelError(overlay, start)
    return
  }
  applySettings(settings)
  calibration = loadStoredCalibration(settings.inputMode)
  requestAnimationFrame(frame)
}

const openSettings = () => {
  showSettings(overlay, {
    settings,
    zoneCount,
    voices: speaker.voices(),
    onChange: applySettings,
    onClose: () => overlay.hide(),
    onRecalibrate: () => {
      overlay.hide()
      calibration = null
    },
    onStartStudy: () =>
      showStudyForm(
        overlay,
        { mode: settings.inputMode, confirm: settings.confirmMode },
        startStudy,
        () => overlay.hide(),
      ),
  })
}

const startStudy = async (init: StudyInit) => {
  overlay.hide()
  applySettings({ ...settings, inputMode: init.mode, confirmMode: init.confirm })
  if (!mouseMode) {
    calibration = null
    // wait until a calibration has been accepted on the result screen
    await new Promise<void>((resolve) => {
      const check = () => (calibration && !overlay.visible() ? resolve() : setTimeout(check, 200))
      check()
    })
  }
  study = createStudySession({
    tester: init.tester,
    mode: init.mode,
    confirm: init.confirm,
    zoneCount,
    userAgent: navigator.userAgent,
    now: () => performance.now(),
  })
  boardState = initialState()
  study.start()
  study.beginPhrase()
  screen.setTargetPhrase(study.currentTarget())
}

const endStudyPhrase = () => {
  if (!study) return
  const done = study.endPhrase(boardState.text)
  boardState = { ...boardState, text: '', boardId: 'home' }
  if (!done) {
    study.beginPhrase()
    screen.setTargetPhrase(study.currentTarget())
    return
  }
  const events = study.finish()
  const summary = sessionSummary(events)
  downloadJson(exportFilename(summary.tester, summary.mode), events)
  screen.setTargetPhrase(null)
  study = null
  showStudySummary(overlay, summary, () => overlay.hide())
}

const speakNow = () => {
  if (speaker.available) speaker.speak(boardState.text)
  else showLargeText(overlay, boardState.text, 3000)
}

const savePhrase = () => {
  const phrase = boardState.text.trim()
  if (!phrase || settings.phrases.length >= phraseSlots(zoneCount)) return
  if (settings.phrases.some((p) => p.toLowerCase() === phrase.toLowerCase())) return
  applySettings({ ...settings, phrases: [...settings.phrases, phrase] })
  screen.textAdded()
}

const handleRequest = (req: BoardRequest) => {
  if (req === 'speak') {
    speakNow()
    if (study) endStudyPhrase()
  }
  if (req === 'recalibrate') calibration = null
  if (req === 'settings') openSettings()
  if (req === 'savePhrase') savePhrase()
}

const onZoneSelected = (zone: Zone, index: number, predictions: string[]) => {
  const before = boardState.text
  boardState = apply(boardState, zone.action, predictions)
  study?.recordSelect(zone.id, boardState.boardId, zone.action.kind, boardState.text)
  screen.flash(index)
  if (boardState.text !== before) screen.textAdded()
  if (boardState.request) handleRequest(boardState.request)
}

const updateFace = (s: TrackingSample | null, t: number) => {
  const found = !!s?.faceFound
  if (found) {
    faceLostSince = null
    if (faceLostReported) {
      faceLostReported = false
      study?.recordFace(true)
    }
    return true
  }
  faceLostSince ??= t
  if (t - faceLostSince > FACE_LOST_MS && !faceLostReported) {
    faceLostReported = true
    study?.recordFace(false)
  }
  return false
}

// mean luma of a 32x32 downsample of the camera frame
const lumaCanvas = document.createElement('canvas')
lumaCanvas.width = 32
lumaCanvas.height = 32
const checkLight = () => {
  const ctx = lumaCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || preview.readyState < 2) return
  ctx.drawImage(preview, 0, 0, 32, 32)
  const d = ctx.getImageData(0, 0, 32, 32).data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) {
    sum += 0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0)
  }
  lowLight = sum / (d.length / 4) < LOW_LIGHT_LUMA
}

const overlayRects = (els: HTMLElement[]): Rect[] =>
  els.map((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  })

// dwell over .gz elements inside an overlay, so settings and result screens work without hands
const driveOverlay = (p: PointerState, confirm: boolean, t: number) => {
  const els = overlay.targets()
  const zones = els.map((_, i) => ({ id: `ov-${i}`, label: '', action: { kind: 'none' as const } }))
  const hit = p.confident
    ? stickyHit(overlayRects(els), zones, p, dwell.status().zone, STICKY_MARGIN)
    : null
  const slot = guard.filter(hit === null ? null : Number(hit.slice(3)))
  const zoneId = slot === null ? null : `ov-${slot}`
  const ev = dwell.update({
    zone: zoneId,
    confident: p.confident,
    confirm,
    t,
    mode: settings.confirmMode,
  })
  const st = dwell.status()
  els.forEach((el, i) => {
    const hover = st.zone === `ov-${i}`
    el.toggleAttribute('data-hover', hover)
    el.style.setProperty('--p', hover ? String(st.progress) : '0')
  })
  if (ev) {
    const i = Number(ev.zone.slice(3))
    guard.selected(i)
    els[i]?.click()
  }
}

const driveBoard = (p: PointerState, confirm: boolean, t: number) => {
  const board = boards[boardState.boardId] ?? boards.home
  if (!board) return
  const predictions = predictor.suggest(currentPrefix(boardState.text))
  const zones = resolveZones(board, predictions)
  const hit = p.confident
    ? stickyHit(screen.rects(), zones, p, dwell.status().zone, STICKY_MARGIN)
    : null
  const slot = guard.filter(hit === null ? null : zones.findIndex((z) => z.id === hit))
  const zoneId = slot === null ? null : (zones[slot]?.id ?? null)
  const ev = dwell.update({
    zone: zoneId,
    confident: p.confident,
    confirm,
    t,
    mode: settings.confirmMode,
  })
  if (ev) {
    const i = zones.findIndex((z) => z.id === ev.zone)
    const zone = zones[i]
    if (zone) {
      guard.selected(i)
      onZoneSelected(zone, i, predictions)
    }
  }
  const st = dwell.status()
  screen.render(zones, boardState.text, predictions, st.zone, st.progress)
}

const frame = (t: number) => {
  frameCount += 1
  if (frameCount % LIGHT_CHECK_EVERY === 0) checkLight()
  const s = latest
  const faceOk = updateFace(s, t)
  const lostLong = !faceOk && faceLostSince !== null && t - faceLostSince > FACE_LOST_MS

  if (!calibration && !calibrating && !overlay.visible() && !mouseMode && faceOk) {
    void calibrate()
  }

  let p: PointerState
  if (mouseMode) {
    p = { ...mouse, confident: mouse.x >= 0 }
  } else {
    const active = calibration ?? pendingCalibration
    const blinking = !!s && faceOk && (s.blink.left > BLINK_SCORE || s.blink.right > BLINK_SCORE)
    blinkSince = blinking ? (blinkSince ?? t) : null
    if (blinking && blinkSince !== null && lastPointer && settings.inputMode !== 'head') {
      p = { ...lastPointer, confident: t - blinkSince <= BLINK_HOLD_MS }
    } else {
      const raw =
        s && faceOk && active ? applyCalibration(active, featuresOf(s, settings.inputMode)) : null
      p = pointer.update(raw, t)
      if (lostLong) p = { ...p, confident: false }
      lastPointer = p
    }
  }
  const confirm = s ? blink.update(s.blink, t) : false

  status.set({
    face: tracker ? (faceOk ? 'found' : 'lost') : 'loading',
    calibration: calibration ? quality(calibration) : 'none',
    mode: settings.inputMode,
    hint: mouseMode ? 'mouse' : lowLight ? 'low light' : undefined,
  })

  if (calibrating) {
    requestAnimationFrame(frame)
    return
  }

  if (p.confident) pointerLayer.move(p)
  else pointerLayer.hide()

  if (overlay.visible()) {
    overlayWasVisible = true
    driveOverlay(p, confirm, t)
  } else {
    if (overlayWasVisible) {
      overlayWasVisible = false
      guard.blockNext()
    }
    driveBoard(p, confirm, t)
  }
  requestAnimationFrame(frame)
}

window.addEventListener('mousemove', (e) => (mouse = { x: e.clientX, y: e.clientY }))
window.addEventListener('keydown', (e) => {
  const inField =
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement ||
    e.target instanceof HTMLTextAreaElement
  if (inField) return
  if (e.key === 'c') calibration = null
  if (e.key === 's') {
    if (overlay.visible()) overlay.hide()
    else openSettings()
  }
  if (e.key === 'm' && isDev) mouseMode = !mouseMode
})

const boot = () => {
  if (new URLSearchParams(location.search).get('mouse') === '1' && isDev) {
    mouseMode = true
    applySettings(settings)
    requestAnimationFrame(frame)
    return
  }
  showStart(overlay, settings, (choice) => {
    applySettings({ ...settings, ...choice, seenStart: true })
    void start()
  })
}

boot()
