import type { ConfirmMode, InputMode } from '../../types'
import type { Overlay } from '../overlay'

export type StartChoice = { inputMode: InputMode; confirmMode: ConfirmMode }

export const pickMode = (v: unknown): InputMode => (v === 'gaze' || v === 'head' ? v : 'both')

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
            ${choice('inputMode', 'both', current.inputMode === 'both', 'Head and eyes together', 'Look at things the natural way: turn your head a little and let your eyes finish. The head gives a steady position and the eyes fine-tune it. Start here.')}
            ${choice('inputMode', 'head', current.inputMode === 'head', 'With my head only', 'Turn your head to move the pointer, eyes can rest. Steady and reliable, a bit slower.')}
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
        <p>Next comes calibration, under a minute: follow a dot to nine spots, follow it as it glides across the screen, then a quick check on a few more dots that measures how accurate it really is. Then the board. Sit an arm's length away with light on your face, not behind you.</p>
        <p><button class="big-button" type="submit">Turn on the camera</button></p>
        <p class="fine">Someone needs to press this once. After that everything, including settings, works by looking. Video is processed on this device and never leaves it.</p>
      </form>
    </div>`)
  const form = el.querySelector<HTMLFormElement>('#start-form')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const d = new FormData(form)
    onStart({
      inputMode: pickMode(d.get('inputMode')),
      confirmMode: d.get('confirmMode') === 'blink' ? 'blink' : 'dwell',
    })
  })
}
