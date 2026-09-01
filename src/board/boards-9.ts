import type { BoardSet } from './types'
import { board, go, inert, letterGroups, say, space, speak, word, z } from './make'

const GROUPS = ['abcdef', 'ghijkl', 'mnopqr', 'stuvwx', 'yz']

const groupTail = () => [go('Back', 'spell'), space(), go('Menu', 'menu')]

const boards = [
  board('home', [
    say('Yes'),
    say('No'),
    go('Spell', 'spell'),
    say('Pain'),
    say('Help'),
    say('Water'),
    say('Bathroom'),
    speak(),
    go('More', 'more'),
  ]),
  board('more', [
    say('Tired'),
    say('Cold'),
    say('Hot'),
    say('Thank you'),
    say('Stop'),
    say('Call nurse'),
    go('Home', 'home'),
    speak(),
    z('Clear', { kind: 'clear' }),
  ]),
  board('spell', [
    ...GROUPS.map((g) => go(g.toUpperCase(), `group-${g}`)),
    go('Home', 'home'),
    go('Words', 'words'),
    space(),
    go('Menu', 'menu'),
  ]),
  ...letterGroups(GROUPS, 9, groupTail),
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
    inert(),
    inert(),
    inert(),
  ]),
]

export const BOARDS_9: BoardSet = Object.fromEntries(boards.map((b) => [b.id, b]))
