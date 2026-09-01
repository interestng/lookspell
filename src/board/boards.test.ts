import { describe, it, expect } from 'vitest'
import { BOARDS_9, BOARDS_6, boardSetFor, resolveZones } from './index'
import type { BoardSet } from './types'

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

describe('board sets', () => {
  it('every 9-board has 9 zones and valid links', () => check(BOARDS_9, 9))
  it('every 6-board has 6 zones and valid links', () => check(BOARDS_6, 6))
  it('both sets share required ids', () => {
    for (const id of ['home', 'spell', 'words', 'menu']) {
      expect(BOARDS_9[id]).toBeDefined()
      expect(BOARDS_6[id]).toBeDefined()
    }
  })
  it('letter groups cover a to z exactly once', () => {
    for (const set of [BOARDS_9, BOARDS_6]) {
      const letters = Object.values(set)
        .filter((b) => b.id.startsWith('group-'))
        .flatMap((b) => b.zones)
        .flatMap((z) => (z.action.kind === 'append' ? [z.action.text] : []))
        .sort()
      expect(letters.join('')).toBe('abcdefghijklmnopqrstuvwxyz')
    }
  })
  it('resolveZones fills word labels and marks empties inert', () => {
    const words = boardSetFor(9).words
    expect(words).toBeDefined()
    const zones = resolveZones(words!, ['water', 'want'])
    expect(zones[0]?.label).toBe('water')
    expect(zones[0]?.inert).toBeFalsy()
    expect(zones[2]?.inert).toBe(true)
  })
})
