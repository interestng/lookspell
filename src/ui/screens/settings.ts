import { DWELL_RANGE } from '../../selection'
import { phraseSlots, type ZoneCount } from '../../board'
import type { Overlay } from '../overlay'
import { escapeHtml } from '../overlay'
import type { Settings } from '../settings-store'
import { pickMode } from './start'

type Deps = {
  settings: Settings
  zoneCount: ZoneCount
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
  const slots = phraseSlots(deps.zoneCount)

  const el = overlay.show(`
    <div class="sheet">
      <h1>Settings</h1>
      <form class="form" id="settings-form">
        <div class="row">
          <button class="big-button gz" type="button" id="close">Back to board</button>
          <button class="big-button gz" type="button" id="recal">Recalibrate</button>
          <button class="big-button gz" type="button" id="study">Start a study session</button>
        </div>
        <p class="fine">The controls below are for a helper with a mouse or touch. Everything above works by looking.</p>
        <div class="field">
          <span>Point with</span>
          <div class="choices">
            ${radio('inputMode', 'both', 'Head and eyes', s.inputMode)}
            ${radio('inputMode', 'head', 'Head only', s.inputMode)}
            ${radio('inputMode', 'gaze', 'Eyes only', s.inputMode)}
          </div>
          <span class="fine">Each mode keeps its own calibration. Switching may ask you to calibrate.</span>
        </div>
        <div class="field">
          <span>Select by</span>
          <div class="choices">
            ${radio('confirmMode', 'dwell', 'Resting on a zone', s.confirmMode)}
            ${radio('confirmMode', 'blink', 'A long blink', s.confirmMode)}
          </div>
        </div>
        <div class="field">
          <span>Dwell time: <output id="dwell-out">${s.dwellMs}</output> ms</span>
          <input type="range" name="dwellMs" min="${DWELL_RANGE.min}" max="${DWELL_RANGE.max}" step="50" value="${s.dwellMs}" />
          <span class="fine">Shorter is faster but easier to trigger by accident.</span>
        </div>
        <div class="field">
          <span>Pointer steadiness (eyes, and head and eyes)</span>
          <div class="choices">
            ${radio('smoothing', 'low', 'Quick', s.smoothing)}
            ${radio('smoothing', 'medium', 'Balanced', s.smoothing)}
            ${radio('smoothing', 'high', 'Steady', s.smoothing)}
          </div>
          <span class="fine">Steadier means less shake and a little more lag.</span>
        </div>
        <div class="field">
          <span>Calibration</span>
          <div class="choices">
            ${radio('calibration', 'full', 'Full: nine dots, then follow a moving dot', s.calibration)}
            ${radio('calibration', 'quick', 'Quick: nine dots only', s.calibration)}
          </div>
          <span class="fine">Full takes about 35 seconds and is noticeably more accurate.</span>
        </div>
        <div class="field">
          <label><span>Quick phrases, one per line (${slots} fit on this board)</span>
            <textarea name="phrases" rows="6">${escapeHtml(s.phrases.join('\n'))}</textarea>
          </label>
          <span class="fine">These fill the Home and More boards in order. Save phrase in the Menu adds whatever is typed.</span>
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
        <p class="fine">Keys: c recalibrate, s settings, m mouse pointer (dev builds).</p>
      </form>
    </div>`)

  const form = el.querySelector<HTMLFormElement>('#settings-form')
  if (!form) return
  form.addEventListener('input', () => {
    const data = new FormData(form)
    const zone = data.get('zoneOverride')
    const smoothing = data.get('smoothing')
    const next: Settings = {
      ...s,
      inputMode: pickMode(data.get('inputMode')),
      confirmMode: data.get('confirmMode') === 'blink' ? 'blink' : 'dwell',
      dwellMs: Number(data.get('dwellMs')) || s.dwellMs,
      smoothing: smoothing === 'low' || smoothing === 'high' ? smoothing : 'medium',
      calibration: data.get('calibration') === 'quick' ? 'quick' : 'full',
      phrases: String(data.get('phrases') ?? '')
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean),
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
