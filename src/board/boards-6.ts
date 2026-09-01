import type { BoardSet } from './types'
import { board, go, letterGroups, say, space, speak, word, z } from './make'

const GROUPS = ['abcde', 'fghij', 'klmno', 'pqrst', 'uvwxyz']

const groupTail = () => [go('Back', 'spell')]

const boards = [
  board('home', [
    say('Yes'),
    say('No'),
    say('Help'),
    say('Pain'),
    go('Spell', 'spell'),
    go('More', 'more'),
  ]),
  board('more', [
    say('Water'),
    say('Bathroom'),
    say('Thank you'),
    say('Tired'),
    speak(),
    go('Home', 'home'),
  ]),
  board('spell', [...GROUPS.map((g) => go(g.toUpperCase(), `group-${g}`)), go('Menu', 'menu')]),
  ...letterGroups(GROUPS, 6, groupTail),
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
    go('Back', 'spell'),
    go('Home', 'home'),
    speak(),
    go('Menu', 'menu'),
  ]),
]

export const BOARDS_6: BoardSet = Object.fromEntries(boards.map((b) => [b.id, b]))
