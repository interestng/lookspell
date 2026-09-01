import type { ConfirmMode, InputMode } from '../types'
import { STUDY_PHRASES } from './phrases'
import type { StudyEvent } from './metrics'

export { STUDY_PHRASES } from './phrases'
export {
  levenshtein,
  phraseMetrics,
  sessionSummary,
  type StudyEvent,
  type PhraseMetrics,
  type SessionSummary,
} from './metrics'

type Init = {
  tester: string
  mode: InputMode
  confirm: ConfirmMode
  zoneCount: number
  userAgent: string
  now: () => number
}

export const createStudySession = (init: Init) => {
  const events: StudyEvent[] = []
  let t0 = 0
  let index = 0
  let done = false
  const t = () => init.now() - t0
  const push = (e: StudyEvent) => events.push(e)

  return {
    start() {
      t0 = init.now()
      push({
        t: 0,
        type: 'session_start',
        tester: init.tester,
        mode: init.mode,
        confirm: init.confirm,
        zoneCount: init.zoneCount,
        userAgent: init.userAgent,
      })
    },
    currentTarget: () => (done ? null : (STUDY_PHRASES[index] ?? null)),
    beginPhrase() {
      const target = STUDY_PHRASES[index]
      if (target !== undefined) push({ t: t(), type: 'phrase_start', index, target })
    },
    recordSelect(zone: string, board: string, actionKind: string, text: string) {
      push({ t: t(), type: 'select', zone, board, actionKind, text })
    },
    recordFace(found: boolean) {
      push({ t: t(), type: found ? 'face_found' : 'face_lost' })
    },
    endPhrase(typed: string): boolean {
      const target = STUDY_PHRASES[index] ?? ''
      push({ t: t(), type: 'phrase_end', index, target, typed })
      index += 1
      done = index >= STUDY_PHRASES.length
      return done
    },
    finish(): StudyEvent[] {
      push({ t: t(), type: 'session_end' })
      return [...events]
    },
    events: () => [...events],
    isDone: () => done,
  }
}

export type StudySession = ReturnType<typeof createStudySession>

export const exportFilename = (tester: string, mode: InputMode): string =>
  `study-${tester.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${mode}-${Date.now()}.json`
