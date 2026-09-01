import type { Overlay } from '../overlay'

const isIOS = () => /iPhone|iPad/.test(navigator.userAgent)

export const showPermission = (overlay: Overlay, onStart: () => void) => {
  const el = overlay.show(`
    <div class="sheet">
      <h1>This board is driven by your eyes.</h1>
      <p>It needs the front camera to see where you are looking. Video is processed on this device and never leaves it.</p>
      <p>The first time, someone has to press the button below. After that the whole board, including settings, works by looking.</p>
      <p><button class="big-button" id="start" type="button">Turn on the camera</button></p>
      <p class="fine">Sit about an arm's length away, with light on your face rather than behind you.</p>
    </div>`)
  el.querySelector('#start')?.addEventListener('click', onStart, { once: true })
}

export const showCameraError = (overlay: Overlay, onRetry: () => void) => {
  const steps = isIOS()
    ? `<ol><li>Open Settings, then Safari, then Camera.</li><li>Set it to Ask or Allow.</li><li>Come back here and try again.</li></ol>`
    : `<ol><li>Click the camera or lock icon in the address bar.</li><li>Allow the camera for this site.</li><li>Try again.</li></ol>`
  const el = overlay.show(`
    <div class="sheet">
      <h1>The camera was blocked.</h1>
      <p>Without it the board cannot see your eyes. To allow it:</p>
      ${steps}
      <p><button class="big-button" id="retry" type="button">Try again</button></p>
    </div>`)
  el.querySelector('#retry')?.addEventListener('click', onRetry, { once: true })
}

export const showModelError = (overlay: Overlay, onRetry: () => void) => {
  const el = overlay.show(`
    <div class="sheet">
      <h1>The face model did not load.</h1>
      <p>The tracker is downloaded once from the internet, then cached. Check the connection and try again.</p>
      <p><button class="big-button" id="retry" type="button">Try again</button></p>
    </div>`)
  el.querySelector('#retry')?.addEventListener('click', onRetry, { once: true })
}

export const showLargeText = (overlay: Overlay, text: string, ms: number) => {
  overlay.show(`<div class="sheet"><h1 class="shout"></h1></div>`)
  const h = overlay.el.querySelector('.shout')
  if (h) h.textContent = text
  setTimeout(() => overlay.hide(), ms)
}
