import type { ConfirmMode, InputMode } from '../types'

export type StudyEvent =
  | {
      t: number
      type: 'session_start'
      tester: string
      mode: InputMode
      confirm: ConfirmMode
      zoneCount: number
      userAgent: string
    }
  | { t: number; type: 'phrase_start'; index: number; target: string }
  | { t: number; type: 'select'; zone: string; board: string; actionKind: string; text: string }
  | { t: number; type: 'face_lost' }
  | { t: number; type: 'face_found' }
  | { t: number; type: 'phrase_end'; index: number; target: string; typed: string }
  | { t: number; type: 'session_end' }

export type PhraseMetrics = {
  index: number
  target: string
  typed: string
  seconds: number
  wpm: number
  errorRate: number
  selections: number
  selectionsPerChar: number
  corrections: number
  faceLostFraction: number
}

export const levenshtein = (a: string, b: string): number => {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    prev = cur
  }
  return prev[b.length] ?? 0
}

const CORRECTION_KINDS = new Set(['deleteChar', 'deleteWord', 'clear'])

const faceLostMs = (slice: StudyEvent[], endT: number) => {
  let lost = 0
  let lostAt: number | null = null
  for (const x of slice) {
    if (x.type === 'face_lost') lostAt ??= x.t
    if (x.type === 'face_found' && lostAt !== null) {
      lost += x.t - lostAt
      lostAt = null
    }
  }
  if (lostAt !== null) lost += endT - lostAt
  return lost
}

export const phraseMetrics = (events: StudyEvent[]): PhraseMetrics[] => {
  const out: PhraseMetrics[] = []
  let startIdx = -1
  events.forEach((e, i) => {
    if (e.type === 'phrase_start') startIdx = i
    if (e.type !== 'phrase_end' || startIdx < 0) return
    const start = events[startIdx]
    if (!start || start.type !== 'phrase_start') return
    const slice = events.slice(startIdx + 1, i)
    const seconds = (e.t - start.t) / 1000
    const typed = e.typed.trim()
    const selects = slice.filter((x) => x.type === 'select')
    const chars = typed.length
    out.push({
      index: e.index,
      target: e.target,
      typed,
      seconds,
      // standard text entry wpm: characters over 5 per word, per minute
      wpm: seconds > 0 ? chars / 5 / (seconds / 60) : 0,
      errorRate: e.target.length ? levenshtein(e.target, typed) / e.target.length : 0,
      selections: selects.length,
      selectionsPerChar: chars ? selects.length / chars : 0,
      corrections: selects.filter((x) => x.type === 'select' && CORRECTION_KINDS.has(x.actionKind))
        .length,
      faceLostFraction: seconds > 0 ? faceLostMs(slice, e.t) / 1000 / seconds : 0,
    })
    startIdx = -1
  })
  return out
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export type SessionSummary = {
  tester: string
  mode: InputMode
  confirm: ConfirmMode
  phrases: PhraseMetrics[]
  meanWpm: number
  meanErrorRate: number
}

export const sessionSummary = (events: StudyEvent[]): SessionSummary => {
  const start = events.find((e) => e.type === 'session_start')
  const head = start?.type === 'session_start' ? start : null
  const phrases = phraseMetrics(events)
  return {
    tester: head?.tester ?? '',
    mode: head?.mode ?? 'gaze',
    confirm: head?.confirm ?? 'dwell',
    phrases,
    meanWpm: mean(phrases.map((p) => p.wpm)),
    meanErrorRate: mean(phrases.map((p) => p.errorRate)),
  }
}
