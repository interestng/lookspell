import { describe, it, expect } from 'vitest'
import { levenshtein, phraseMetrics, sessionSummary, type StudyEvent } from './index'

describe('levenshtein', () => {
  it('basic distances', () => {
    expect(levenshtein('', '')).toBe(0)
    expect(levenshtein('abc', '')).toBe(3)
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('same', 'same')).toBe(0)
  })
})

const ev: StudyEvent[] = [
  {
    t: 0,
    type: 'session_start',
    tester: 'a',
    mode: 'gaze',
    confirm: 'dwell',
    zoneCount: 9,
    userAgent: 'x',
  },
  { t: 1000, type: 'phrase_start', index: 0, target: 'i am cold' },
  { t: 2000, type: 'select', zone: 'g', board: 'spell', actionKind: 'go', text: '' },
  { t: 3000, type: 'select', zone: 'i', board: 'group-ijkl', actionKind: 'append', text: 'i' },
  { t: 4000, type: 'face_lost' },
  { t: 6000, type: 'face_found' },
  { t: 7000, type: 'select', zone: 'd', board: 'menu', actionKind: 'deleteChar', text: '' },
  { t: 31000, type: 'select', zone: 's', board: 'home', actionKind: 'speak', text: 'i am cold' },
  { t: 31000, type: 'phrase_end', index: 0, target: 'i am cold', typed: 'i am cold' },
  { t: 32000, type: 'phrase_start', index: 1, target: 'thank you' },
  { t: 62000, type: 'phrase_end', index: 1, target: 'thank you', typed: 'thank yu' },
  { t: 62000, type: 'session_end' },
]

describe('phraseMetrics', () => {
  it('computes wpm, error rate, selections, corrections, face-lost fraction', () => {
    const m = phraseMetrics(ev)
    expect(m).toHaveLength(2)
    const p0 = m[0]!
    expect(p0.seconds).toBe(30)
    // 9 chars / 5 = 1.8 words over 0.5 min
    expect(p0.wpm).toBeCloseTo(3.6)
    expect(p0.errorRate).toBe(0)
    expect(p0.selections).toBe(4)
    expect(p0.selectionsPerChar).toBeCloseTo(4 / 9)
    expect(p0.corrections).toBe(1)
    expect(p0.faceLostFraction).toBeCloseTo(2 / 30)
    const p1 = m[1]!
    expect(p1.errorRate).toBeCloseTo(1 / 9)
  })
})

describe('sessionSummary', () => {
  it('averages across phrases', () => {
    const s = sessionSummary(ev)
    expect(s.tester).toBe('a')
    expect(s.mode).toBe('gaze')
    expect(s.meanWpm).toBeCloseTo((3.6 + 8 / 5 / 0.5) / 2)
    expect(s.meanErrorRate).toBeCloseTo((0 + 1 / 9) / 2)
  })
})
