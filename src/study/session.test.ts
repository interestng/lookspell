import { describe, it, expect } from 'vitest'
import { createStudySession, STUDY_PHRASES, exportFilename } from './index'

const make = () => {
  let t = 0
  const s = createStudySession({
    tester: 'p1',
    mode: 'head',
    confirm: 'blink',
    zoneCount: 6,
    userAgent: 'ua',
    now: () => t,
  })
  return { s, tick: (ms: number) => (t += ms) }
}

describe('study session', () => {
  it('walks through all phrases and logs in order', () => {
    const { s, tick } = make()
    s.start()
    expect(s.currentTarget()).toBe(STUDY_PHRASES[0])
    for (let i = 0; i < STUDY_PHRASES.length; i++) {
      s.beginPhrase()
      tick(1000)
      s.recordSelect('z', 'home', 'append', 'x')
      const last = s.endPhrase('x')
      expect(last).toBe(i === STUDY_PHRASES.length - 1)
    }
    expect(s.isDone()).toBe(true)
    expect(s.currentTarget()).toBeNull()
    const events = s.finish()
    expect(events[0]?.type).toBe('session_start')
    expect(events.at(-1)?.type).toBe('session_end')
    expect(events.filter((e) => e.type === 'phrase_end')).toHaveLength(STUDY_PHRASES.length)
  })
  it('records face events', () => {
    const { s } = make()
    s.start()
    s.recordFace(false)
    s.recordFace(true)
    expect(s.events().map((e) => e.type)).toEqual(['session_start', 'face_lost', 'face_found'])
  })
  it('builds a safe filename', () => {
    expect(exportFilename('P 1', 'gaze')).toMatch(/^study-p-1-gaze-\d+\.json$/)
  })
})
