import '../src/ui/theme.css'
import './landing.css'
import { createDwellMachine } from '../src/selection'

const CIRC = 2 * Math.PI * 44
const SAYINGS = ['Yes', 'Water', 'Thank you', 'Call the nurse']

const runDemo = () => {
  const zone = document.getElementById('demo-zone')
  const ring = document.getElementById('demo-ring')
  const label = document.getElementById('demo-label')
  const said = document.getElementById('demo-said')
  if (!zone || !ring || !label || !said) return

  const dwell = createDwellMachine({ dwellMs: 900, graceMs: 150, cooldownMs: 700 })
  let over = false
  let count = 0
  zone.addEventListener('pointerenter', () => (over = true))
  zone.addEventListener('pointerleave', () => (over = false))

  const frame = (t: number) => {
    const ev = dwell.update({
      zone: over ? 'demo' : null,
      confident: true,
      confirm: false,
      t,
      mode: 'dwell',
    })
    const st = dwell.status()
    zone.toggleAttribute('data-hover', st.zone === 'demo')
    ring.style.strokeDashoffset = String(CIRC * (1 - st.progress))
    if (ev) {
      said.textContent = `selected: ${label.textContent?.toLowerCase()}, ${(t / 1000).toFixed(1)}s`
      count += 1
      label.textContent = SAYINGS[count % SAYINGS.length] ?? 'Yes'
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

type Results = {
  generatedAt: string
  n: number
  sessions: {
    tester: string
    mode: string
    confirm: string
    meanWpm: number
    meanErrorRate: number
  }[]
  byMode: Record<string, { meanWpm: number; meanErrorRate: number; n: number }>
}

const pct = (x: number) => `${Math.round(x * 100)}%`

const renderResults = async () => {
  const body = document.getElementById('results-body')
  if (!body) return
  let data: Results | null = null
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}results.json`, { cache: 'no-store' })
    if (res.ok) data = (await res.json()) as Results
  } catch {
    data = null
  }
  if (!data || !data.sessions.length) {
    body.innerHTML = `
      <p>The pilot has not been run yet. The design, so the numbers mean something when they arrive:</p>
      <p>Two or three healthy volunteers each spell five fixed phrases (for example <em>call the nurse</em>) using the board, once pointing with their eyes and once with their head. The app records every selection, correction, and loss of tracking. From that: words per minute, error rate against the target phrase, selections per character, and the share of time the face was lost.</p>
      <p class="fine">Commercial eye‑gaze users typically reach 5 to 15 words per minute with prediction. That is the bar this is measured against.</p>`
    return
  }
  const modes = Object.entries(data.byMode)
  const modeRows = modes
    .map(
      ([mode, m]) =>
        `<tr><td>${mode}</td><td class="big">${m.meanWpm.toFixed(1)}</td><td>${pct(m.meanErrorRate)}</td><td>${m.n}</td></tr>`,
    )
    .join('')
  const sessionRows = data.sessions
    .map(
      (s) =>
        `<tr><td>${s.tester}</td><td>${s.mode}</td><td>${s.confirm}</td><td>${s.meanWpm.toFixed(1)}</td><td>${pct(s.meanErrorRate)}</td></tr>`,
    )
    .join('')
  body.innerHTML = `
    <table class="results-table" aria-label="results by pointing mode">
      <thead><tr><th>pointing</th><th>words / min</th><th>error rate</th><th>sessions</th></tr></thead>
      <tbody>${modeRows}</tbody>
    </table>
    <table class="results-table" aria-label="results by session">
      <thead><tr><th>tester</th><th>pointing</th><th>select</th><th>wpm</th><th>error</th></tr></thead>
      <tbody>${sessionRows}</tbody>
    </table>
    <p class="results-caveat">
      ${data.n} healthy ${data.n === 1 ? 'tester' : 'testers'}, one session each per mode, five short phrases, no training beyond the calibration. Commercial eye‑gaze users with practice reach 5 to 15 words per minute. These numbers show the tool works and roughly how fast; with this sample they do not show more than that.
    </p>`
}

runDemo()
void renderResults()
