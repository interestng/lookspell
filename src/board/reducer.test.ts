import { describe, it, expect } from 'vitest'
import { apply, initialState } from './reducer'

const preds = ['water', 'want', 'was']

describe('board reducer', () => {
  it('appends and spaces', () => {
    let s = initialState()
    s = apply(s, { kind: 'append', text: 'h' }, preds)
    s = apply(s, { kind: 'append', text: 'i' }, preds)
    s = apply(s, { kind: 'space' }, preds)
    expect(s.text).toBe('hi ')
  })
  it('does not double spaces', () => {
    let s = apply(initialState(), { kind: 'space' }, preds)
    s = apply(s, { kind: 'space' }, preds)
    expect(s.text).toBe('')
  })
  it('deletes char and word', () => {
    let s = { ...initialState(), text: 'call the nurse' }
    s = apply(s, { kind: 'deleteChar' }, preds)
    expect(s.text).toBe('call the nurs')
    s = apply(s, { kind: 'deleteWord' }, preds)
    expect(s.text).toBe('call the ')
    s = apply(s, { kind: 'deleteWord' }, preds)
    expect(s.text).toBe('call ')
  })
  it('prediction replaces the current partial word and adds a space', () => {
    let s = { ...initialState(), text: 'i wa' }
    s = apply(s, { kind: 'prediction', index: 0 }, preds)
    expect(s.text).toBe('i water ')
  })
  it('prediction with no word is a no-op', () => {
    const s = { ...initialState(), text: 'i wa' }
    expect(apply(s, { kind: 'prediction', index: 5 }, preds)).toEqual(s)
  })
  it('go changes board, speak sets flag, clear empties', () => {
    let s = apply(initialState(), { kind: 'go', board: 'spell' }, preds)
    expect(s.boardId).toBe('spell')
    s = apply({ ...s, text: 'hi' }, { kind: 'speak' }, preds)
    expect(s.speakRequested).toBe(true)
    s = apply(s, { kind: 'clear' }, preds)
    expect(s.text).toBe('')
    expect(s.speakRequested).toBe(false)
  })
  it('append from a letter group returns to spell board', () => {
    let s = apply(initialState(), { kind: 'go', board: 'group-abcd' }, preds)
    s = apply(s, { kind: 'append', text: 'a' }, preds)
    expect(s.boardId).toBe('spell')
  })
})
