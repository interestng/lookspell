import { describe, it, expect } from 'vitest'
import { createPredictor, currentPrefix } from './index'

const words = ['the', 'water', 'want', 'was', 'we', 'nurse', 'no', 'need']

describe('predictor', () => {
  it('returns matches in frequency order', () => {
    const p = createPredictor(words)
    expect(p.suggest('wa')).toEqual(['water', 'want', 'was'])
  })
  it('limits results', () => {
    const p = createPredictor(words)
    expect(p.suggest('w', 2)).toEqual(['water', 'want'])
  })
  it('empty prefix gives the most frequent words', () => {
    const p = createPredictor(words)
    expect(p.suggest('', 3)).toEqual(['the', 'water', 'want'])
  })
  it('no match gives empty', () => {
    expect(createPredictor(words).suggest('zz')).toEqual([])
  })
  it('excludes a word that only equals the prefix', () => {
    expect(createPredictor(words).suggest('no')).toEqual([])
  })
})

describe('currentPrefix', () => {
  it('takes the last partial word', () => {
    expect(currentPrefix('i wa')).toBe('wa')
    expect(currentPrefix('i want ')).toBe('')
    expect(currentPrefix('')).toBe('')
  })
})
