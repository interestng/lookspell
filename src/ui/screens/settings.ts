import { DWELL_RANGE } from '../../selection'
import type { Overlay } from '../overlay'
import { escapeHtml } from '../overlay'
import type { Settings } from '../settings-store'

type Deps = {
  settings: Settings
  voices: SpeechSynthesisVoice[]
  onChange: (s: Settings) => void
  onClose: () => void
  onRecalibrate: () => void
  onStartStudy: () => void
}

const radio = <K extends keyof Settings>(
  name: K,
  value: string,
  label: string,
  current: Settings[K],
) => `
  <label class="choice gz">
    <input type="radio" name="${name}" value="${value}" ${String(current) === value ? 'checked' : ''} />
    ${label}
  </label>`

export const showSettings = (overlay: Overlay, deps: Deps) => {
  const s = { ...deps.settings }
  const voiceOptions = deps.voices
    .filter((v) => v.lang.startsWith('en'))
    .map(
      (v) =>
        `<option value="${escapeHtml(v.name)}" ${v.name === s.voice ? 'selected' : ''}>${escapeHtml(v.name)}</option>`,
    )
    .join('')

  const el = overlay.show(`
    <div class="sheet">
      <h1>Settings</h1>
      <form class="form" id="settings-form">
        <div class="field">
          <span>Point with</span>
          <div class="choices">
            ${radio('inputMode', 'gaze', 'Eyes', s.inputMode)}
            ${radio('inputMode', 'head', 'Head', s.inputMode)}
          </div>
        </div>
        <div class="field">
          <span>Select by</span>
          <div class="choices">
            ${radio('confirmMode', 'dwell', 'Looking for a moment', s.confirmMode)}
            ${radio('confirmMode', 'blink', 'A long blink', s.confirmMode)}
          </div>
        </div>
        <div class="field">
          <span>Dwell time: <output id="dwell-out">${s.dwellMs}</output> ms</span>
          <input type="range" name="dwellMs" min="${DWELL_RANGE.min}" max="${DWELL_RANGE.max}" step="50" value="${s.dwellMs}" />
        </div>
        <div class="field">
          <span>Board size</span>
          <div class="choices">
            ${radio('zoneOverride', 'null', 'Automatic', s.zoneOverride)}
            ${radio('zoneOverride', '9', '9 zones', s.zoneOverride)}
            ${radio('zoneOverride', '6', '6 zones', s.zoneOverride)}
          </div>
          <span class="fine">Changing this reloads the board.</span>
        </div>
        <div class="field">
          <label><span>Voice</span>
            <select name="voice"><option value="">Default English voice</option>${voiceOptions}</select>
          </label>
        </div>
        <div class="field">
          <div class="choices">
            <label class="choice gz"><input type="checkbox" name="showPreview" ${s.showPreview ? 'checked' : ''} /> Show camera preview</label>
            <label class="choice gz"><input type="checkbox" name="mirror" ${s.mirror ? 'checked' : ''} /> Mirror preview</label>
          </div>
        </div>
        <div class="row">
          <button class="big-button gz" type="button" id="recal">Recalibrate</button>
          <button class="big-button gz" type="button" id="study">Start a study session</button>
          <button class="big-button gz" type="button" id="close">Back to board</button>
        </div>
        <p class="fine">Shortcuts: c recalibrate, s settings, m mouse pointer (dev).</p>
      </form>
    </div>`)

  const form = el.querySelector<HTMLFormElement>('#settings-form')
  if (!form) return
  form.addEventListener('input', () => {
    const data = new FormData(form)
    const zone = data.get('zoneOverride')
    const next: Settings = {
      ...s,
      inputMode: data.get('inputMode') === 'head' ? 'head' : 'gaze',
      confirmMode: data.get('confirmMode') === 'blink' ? 'blink' : 'dwell',
      dwellMs: Number(data.get('dwellMs')) || s.dwellMs,
      voice: (data.get('voice') as string) || null,
      zoneOverride: zone === '9' ? 9 : zone === '6' ? 6 : null,
      showPreview: data.get('showPreview') === 'on',
      mirror: data.get('mirror') === 'on',
    }
    const out = el.querySelector('#dwell-out')
    if (out) out.textContent = String(next.dwellMs)
    Object.assign(s, next)
    deps.onChange(next)
  })
  el.querySelector('#recal')?.addEventListener('click', deps.onRecalibrate)
  el.querySelector('#study')?.addEventListener('click', deps.onStartStudy)
  el.querySelector('#close')?.addEventListener('click', deps.onClose)
}
