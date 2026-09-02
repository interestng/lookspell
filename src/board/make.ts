import type { Board, BoardAction, Zone } from './types'

let inertSeq = 0

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')

export const z = (label: string, action: BoardAction): Zone => ({
  id: `${slug(label)}:${action.kind}`,
  label,
  action,
})
export const say = (text: string): Zone =>
  z(text, { kind: 'append', text: `${text.toLowerCase()} ` })
export const letter = (c: string): Zone => z(c.toUpperCase(), { kind: 'append', text: c })
export const go = (label: string, board: string): Zone => ({
  id: `go-${board}:${slug(label)}`,
  label,
  action: { kind: 'go', board },
})
export const inert = (): Zone => ({
  id: `inert-${inertSeq++}`,
  label: '',
  action: { kind: 'none' },
  inert: true,
})
export const word = (i: number): Zone => ({
  id: `word-${i}`,
  label: '',
  action: { kind: 'prediction', index: i },
})
export const space = (): Zone => z('Space', { kind: 'space' })
export const speak = (): Zone => z('Speak', { kind: 'speak' })
export const board = (id: string, zones: Zone[]): Board => ({ id, zones })

// a phrase slot takes the next custom phrase, or goes inert when the list runs out
export const phraseFiller = (phrases: string[]) => {
  let i = 0
  return (): Zone => {
    const p = phrases[i++]
    return p && p.trim() ? say(p.trim()) : inert()
  }
}

export const letterGroups = (groups: string[], perBoard: number, tail: () => Zone[]): Board[] =>
  groups.map((g) => {
    const zones = [...g].map(letter)
    // a group that already fills the board gets no back zone, the letter itself returns to spell
    const t = zones.length >= perBoard ? [] : tail()
    while (zones.length < perBoard - t.length) zones.push(inert())
    return board(`group-${g}`, [...zones, ...t])
  })
