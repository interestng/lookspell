import { describe, it, expect } from 'vitest'
import { buildBoards, DEFAULT_PHRASES, phraseSlots, resolveZones } from './index'
import type { BoardSet, ZoneCount } from './types'

const check = (set: BoardSet, n: number) => {
  for (const board of Object.values(set)) {
    expect(board.zones, board.id).toHaveLength(n)
    const ids = new Set(board.zones.map((z) => z.id))
    expect(ids.size, `${board.id} has duplicate zone ids`).toBe(n)
    for (const z of board.zones) {
      if (z.action.kind === 'go') {
        expect(set[z.action.board], `${board.id} -> ${z.action.board}`).toBeDefined()
      }
    }
  }
}

const sets: [ZoneCount, BoardSet][] = [
  [9, buildBoards(9, DEFAULT_PHRASES)],
  [6, buildBoards(6, DEFAULT_PHRASES)],
]

describe('board sets', () => {
  it('every board has the right zone count and valid links', () => {
    for (const [n, set] of sets) check(set, n)
  })
  it('both sets share required ids', () => {
    for (const [, set] of sets) {
      for (const id of ['home', 'spell', 'words', 'menu']) expect(set[id]).toBeDefined()
    }
  })
  it('letter groups cover a to z exactly once', () => {
    for (const [, set] of sets) {
      const letters = Object.values(set)
        .filter((b) => b.id.startsWith('group-'))
        .flatMap((b) => b.zones)
        .flatMap((z) => (z.action.kind === 'append' ? [z.action.text] : []))
        .sort()
      expect(letters.join('')).toBe('abcdefghijklmnopqrstuvwxyz')
    }
  })
  it('menu offers recalibrate, settings and save phrase in both sets', () => {
    for (const [, set] of sets) {
      const kinds = Object.values(set)
        .filter((b) => b.id.startsWith('menu'))
        .flatMap((b) => b.zones.map((z) => z.action.kind))
      for (const k of ['recalibrate', 'settings', 'savePhrase', 'speak', 'deleteChar', 'clear']) {
        expect(kinds, k).toContain(k)
      }
    }
  })
  it('resolveZones fills word labels and marks empties inert', () => {
    const words = buildBoards(9, DEFAULT_PHRASES).words
    expect(words).toBeDefined()
    const zones = resolveZones(words!, ['water', 'want'])
    expect(zones[0]?.label).toBe('water')
    expect(zones[0]?.inert).toBeFalsy()
    expect(zones[2]?.inert).toBe(true)
  })
})

describe('custom phrases', () => {
  it('fills phrase slots in order and leaves the rest inert', () => {
    const set = buildBoards(9, ['Yes', 'No', 'Coffee'])
    const home = set.home!
    const says = home.zones.filter((z) => z.action.kind === 'append')
    expect(says.map((z) => z.label)).toEqual(['Yes', 'No', 'Coffee'])
    const inert = [...home.zones, ...set.more!.zones].filter((z) => z.inert).length
    expect(inert).toBe(phraseSlots(9) - 3)
    check(set, 9)
  })
  it('ignores phrases beyond the available slots', () => {
    const many = Array.from({ length: 40 }, (_, i) => `p${i}`)
    const set = buildBoards(6, many)
    const says = Object.values(set)
      .filter((b) => b.id === 'home' || b.id === 'more')
      .flatMap((b) => b.zones)
      .filter((z) => z.action.kind === 'append')
    expect(says).toHaveLength(phraseSlots(6))
    check(set, 6)
  })
  it('phrase text is lowercased with a trailing space', () => {
    const set = buildBoards(9, ['Thank you'])
    const z = set.home!.zones[0]!
    expect(z.label).toBe('Thank you')
    expect(z.action).toEqual({ kind: 'append', text: 'thank you ' })
  })
})
