import type { BoardSet, ZoneCount } from './types'
import { board, go, letterGroups, phraseFiller, space, speak, word, z } from './make'

export const DEFAULT_PHRASES = [
  'Yes',
  'No',
  'Pain',
  'Help',
  'Water',
  'Bathroom',
  'Tired',
  'Cold',
  'Hot',
  'Thank you',
  'Stop',
  'Call nurse',
]

const GROUPS_9 = ['abcdef', 'ghijkl', 'mnopqr', 'stuvwx', 'yz']
const GROUPS_6 = ['abcde', 'fghij', 'klmno', 'pqrst', 'uvwxyz']

// how many custom phrases a board set can show across home and more
export const phraseSlots = (n: ZoneCount) => (n === 9 ? 12 : 8)

const nine = (phrases: string[]): BoardSet => {
  const p = phraseFiller(phrases)
  const groupTail = () => [go('Back', 'spell'), space(), go('Menu', 'menu')]
  const boards = [
    board('home', [
      p(),
      p(),
      go('Spell', 'spell'),
      p(),
      p(),
      p(),
      p(),
      speak(),
      go('More', 'more'),
    ]),
    board('more', [p(), p(), p(), p(), p(), p(), go('Home', 'home'), speak(), go('Menu', 'menu')]),
    board('spell', [
      ...GROUPS_9.map((g) => go(g.toUpperCase(), `group-${g}`)),
      go('Home', 'home'),
      go('Words', 'words'),
      space(),
      go('Menu', 'menu'),
    ]),
    ...letterGroups(GROUPS_9, 9, groupTail),
    board('words', [
      word(0),
      word(1),
      word(2),
      word(3),
      word(4),
      word(5),
      go('Back', 'spell'),
      space(),
      go('Menu', 'menu'),
    ]),
    board('menu', [
      speak(),
      z('Delete letter', { kind: 'deleteChar' }),
      z('Delete word', { kind: 'deleteWord' }),
      z('Clear', { kind: 'clear' }),
      go('Home', 'home'),
      go('Back', 'spell'),
      z('Save phrase', { kind: 'savePhrase' }),
      z('Recalibrate', { kind: 'recalibrate' }),
      z('Settings', { kind: 'settings' }),
    ]),
  ]
  return Object.fromEntries(boards.map((b) => [b.id, b]))
}

const six = (phrases: string[]): BoardSet => {
  const p = phraseFiller(phrases)
  const groupTail = () => [go('Back', 'spell')]
  const boards = [
    board('home', [p(), p(), p(), p(), go('Spell', 'spell'), go('More', 'more')]),
    board('more', [p(), p(), p(), p(), speak(), go('Home', 'home')]),
    board('spell', [...GROUPS_6.map((g) => go(g.toUpperCase(), `group-${g}`)), go('Menu', 'menu')]),
    ...letterGroups(GROUPS_6, 6, groupTail),
    board('words', [word(0), word(1), word(2), word(3), space(), go('Back', 'spell')]),
    board('menu', [
      space(),
      z('Delete', { kind: 'deleteChar' }),
      go('Words', 'words'),
      speak(),
      go('Home', 'home'),
      go('More', 'menu-2'),
    ]),
    board('menu-2', [
      z('Delete word', { kind: 'deleteWord' }),
      z('Clear', { kind: 'clear' }),
      z('Save phrase', { kind: 'savePhrase' }),
      z('Recalibrate', { kind: 'recalibrate' }),
      z('Settings', { kind: 'settings' }),
      go('Back', 'spell'),
    ]),
  ]
  return Object.fromEntries(boards.map((b) => [b.id, b]))
}

export const buildBoards = (n: ZoneCount, phrases: string[]): BoardSet =>
  n === 9 ? nine(phrases) : six(phrases)
