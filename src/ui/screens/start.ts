import type { ConfirmMode, InputMode } from '../../types'
import type { Overlay } from '../overlay'

export type StartChoice = { inputMode: InputMode; confirmMode: ConfirmMode }

const choice = (name: string, value: string, checked: boolean, title: string, body: string) => `
  <label class="choice card-choice">
    <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} />
    <span><strong>${title}</strong><br /><span class="fine">${body}</span></span>
  </label>`

export const showStart = (
  overlay: Overlay,
  current: StartChoice,
  onStart: (c: StartChoice) => void,
) => {
  const el = overlay.show(`
    <div class="sheet">
      <h1>Speak by looking.</h1>
      <p>This board is a proof of concept built with a webcam. It is not a medical device and is not a replacement for a clinical eye-gaze system. Use it to explore, test, and measure.</p>
      <form class="form" id="start-form">
        <div class="field">
          <span>How will you point?</span>
          <div class="choices stack">
            ${choice('inputMode', 'head', current.inputMode === 'head', 'With my head', 'Turn your head slightly to move the pointer. A webcam measures this well. Best if you can move your neck at all.')}
            ${choice('inputMode', 'gaze', current.inputMode === 'gaze', 'With my eyes only', 'Keep your head still and move your eyes. Works when nothing else moves, but a webcam sees eyes coarsely, so expect a shakier pointer and larger misses.')}
          </div>
        </div>
        <div class="field">
          <span>How will you select?</span>
          <div class="choices stack">
            ${choice('confirmMode', 'dwell', current.confirmMode === 'dwell', 'Rest on it', 'Hold the pointer on a zone for about a second. A ring fills, then it selects.')}
            ${choice('confirmMode', 'blink', current.confirmMode === 'blink', 'Long blink', 'Point at a zone, then close both eyes for about half a second. Normal blinks are ignored.')}
          </div>
        </div>
        <p>Next comes calibration, about 35 seconds: follow a dot to nine spots, then follow it as it glides across the screen. Then the board. Sit an arm's length away with light on your face, not behind you.</p>
        <p><button class="big-button" type="submit">Turn on the camera</button></p>
        <p class="fine">Someone needs to press this once. After that everything, including settings, works by looking. Video is processed on this device and never leaves it.</p>
      </form>
    </div>`)
  const form = el.querySelector<HTMLFormElement>('#start-form')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const d = new FormData(form)
    onStart({
      inputMode: d.get('inputMode') === 'gaze' ? 'gaze' : 'head',
      confirmMode: d.get('confirmMode') === 'blink' ? 'blink' : 'dwell',
    })
  })
}
