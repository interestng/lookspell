import './theme.css'
import './app.css'
import { apply, boardSetFor, hitTest, initialState, resolveZones, zoneCountFor } from '../board'
import { createDwellMachine } from '../selection'
import { createPredictor, currentPrefix, loadWords } from '../predict'
import { createSpeaker } from '../speech'
import { createBoardScreen } from './screens/board'
import { createPointerLayer } from './pointer-layer'
import { createStatus } from './status'

const byId = (id: string) => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el
}

const root = byId('app')
const zoneCount = zoneCountFor(window.innerWidth, window.innerHeight)
const boards = boardSetFor(zoneCount)
const screen = createBoardScreen(root, zoneCount)
const pointer = createPointerLayer(byId('pointer'))
const status = createStatus(byId('status'))
const speaker = createSpeaker()
const dwell = createDwellMachine()
let state = initialState()
let predictor = createPredictor([])
loadWords(`${import.meta.env.BASE_URL}words.txt`).then((w) => (predictor = createPredictor(w)))
speaker.onStateChange((on) => screen.setSpeaking(on))

let mouse = { x: -1, y: -1 }
window.addEventListener('mousemove', (e) => (mouse = { x: e.clientX, y: e.clientY }))
status.set({ face: 'loading', calibration: 'none', mode: 'gaze', hint: 'mouse preview' })

const frame = (t: number) => {
  const board = boards[state.boardId] ?? boards.home
  if (!board) return
  const predictions = predictor.suggest(currentPrefix(state.text))
  const zones = resolveZones(board, predictions)
  const zoneId = hitTest(screen.rects(), zones, mouse)
  const ev = dwell.update({ zone: zoneId, confident: true, confirm: false, t, mode: 'dwell' })
  if (ev) {
    const zone = zones.find((z) => z.id === ev.zone)
    if (zone) state = apply(state, zone.action, predictions)
    if (state.speakRequested) speaker.speak(state.text)
  }
  const s = dwell.status()
  screen.render(zones, state.text, predictions, s.zone, s.progress)
  pointer.move({ ...mouse, confident: true })
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
