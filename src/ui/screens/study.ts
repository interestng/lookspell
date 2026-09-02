import type { SessionSummary } from '../../study'
import { STUDY_PHRASES } from '../../study'
import type { ConfirmMode, InputMode } from '../../types'
import type { Overlay } from '../overlay'
import { escapeHtml } from '../overlay'
import { pickMode } from './start'

export type StudyInit = { tester: string; mode: InputMode; confirm: ConfirmMode }

export const showStudyForm = (
  overlay: Overlay,
  defaults: { mode: InputMode; confirm: ConfirmMode },
  onStart: (init: StudyInit) => void,
  onCancel: () => void,
) => {
  const el = overlay.show(`
    <div class="sheet">
      <h1>Study session</h1>
      <p>You will spell ${STUDY_PHRASES.length} short phrases, one at a time. Each phrase appears above the board. When it reads correctly, select Speak to move on. Everything is timed and saved to a file on this device only.</p>
      <form class="form" id="study-form">
        <label class="field"><span>Tester id</span><input type="text" name="tester" required autocomplete="off" placeholder="p1" /></label>
        <div class="field"><span>Point with</span><div class="choices">
          <label class="choice"><input type="radio" name="mode" value="both" ${defaults.mode === 'both' ? 'checked' : ''}/> Head and eyes</label>
          <label class="choice"><input type="radio" name="mode" value="head" ${defaults.mode === 'head' ? 'checked' : ''}/> Head</label>
          <label class="choice"><input type="radio" name="mode" value="gaze" ${defaults.mode === 'gaze' ? 'checked' : ''}/> Eyes</label>
        </div></div>
        <div class="field"><span>Select by</span><div class="choices">
          <label class="choice"><input type="radio" name="confirm" value="dwell" ${defaults.confirm === 'dwell' ? 'checked' : ''}/> Dwell</label>
          <label class="choice"><input type="radio" name="confirm" value="blink" ${defaults.confirm === 'blink' ? 'checked' : ''}/> Long blink</label>
        </div></div>
        <div class="row">
          <button class="big-button" type="submit">Calibrate and begin</button>
          <button class="big-button" type="button" id="cancel">Cancel</button>
        </div>
      </form>
    </div>`)
  const form = el.querySelector<HTMLFormElement>('#study-form')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const d = new FormData(form)
    onStart({
      tester: String(d.get('tester') || 'anon').trim(),
      mode: pickMode(d.get('mode')),
      confirm: d.get('confirm') === 'blink' ? 'blink' : 'dwell',
    })
  })
  el.querySelector('#cancel')?.addEventListener('click', onCancel)
  el.querySelector<HTMLInputElement>('input[name=tester]')?.focus()
}

const fmt = (n: number, digits = 2) => n.toFixed(digits)

export const showStudySummary = (overlay: Overlay, s: SessionSummary, onClose: () => void) => {
  const rows = s.phrases
    .map(
      (p) => `<tr>
        <td>${escapeHtml(p.target)}</td>
        <td>${escapeHtml(p.typed)}</td>
        <td>${fmt(p.seconds, 0)}</td>
        <td>${fmt(p.wpm)}</td>
        <td>${fmt(p.errorRate * 100, 0)}%</td>
        <td>${p.selections}</td>
        <td>${p.corrections}</td>
      </tr>`,
    )
    .join('')
  const el = overlay.show(`
    <div class="sheet">
      <h1>Done. Thank you.</h1>
      <p>${escapeHtml(s.tester)}, ${s.mode} mode, ${s.confirm}. Mean ${fmt(s.meanWpm)} words per minute, mean error rate ${fmt(s.meanErrorRate * 100, 0)}%.</p>
      <table class="results">
        <thead><tr><th>target</th><th>typed</th><th>s</th><th>wpm</th><th>err</th><th>sel</th><th>corr</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="fine">The log file has been downloaded. Drop it into analysis/data to include it in the notebook.</p>
      <p><button class="big-button gz" type="button" id="close">Back to board</button></p>
    </div>`)
  el.querySelector('#close')?.addEventListener('click', onClose)
}

export const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
