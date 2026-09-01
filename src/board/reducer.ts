import type { Board, BoardAction, BoardState, Zone } from './types'

export const initialState = (): BoardState => ({ text: '', boardId: 'home', request: null })

const currentWordStart = (text: string) => text.lastIndexOf(' ') + 1

export const apply = (
  state: BoardState,
  action: BoardAction,
  predictions: string[],
): BoardState => {
  const s: BoardState = { ...state, request: null }
  switch (action.kind) {
    case 'append': {
      // a letter came from a group board, bounce back so the next letter is two hops again
      const boardId = s.boardId.startsWith('group-') ? 'spell' : s.boardId
      return { ...s, text: s.text + action.text, boardId }
    }
    case 'space':
      return s.text === '' || s.text.endsWith(' ') ? s : { ...s, text: `${s.text} ` }
    case 'deleteChar':
      return { ...s, text: s.text.slice(0, -1) }
    case 'deleteWord': {
      const trimmed = s.text.replace(/\s+$/, '')
      return { ...s, text: trimmed.slice(0, currentWordStart(trimmed)) }
    }
    case 'clear':
      return { ...s, text: '' }
    case 'speak':
      return { ...s, request: 'speak' }
    case 'recalibrate':
      return { ...s, request: 'recalibrate' }
    case 'settings':
      return { ...s, request: 'settings' }
    case 'savePhrase':
      return { ...s, request: 'savePhrase' }
    case 'go':
      return { ...s, boardId: action.board }
    case 'prediction': {
      const w = predictions[action.index]
      if (!w) return state
      return { ...s, text: `${s.text.slice(0, currentWordStart(s.text))}${w} `, boardId: 'spell' }
    }
    case 'none':
      return state
  }
}

export const resolveZones = (board: Board, predictions: string[]): Zone[] =>
  board.zones.map((zone) => {
    if (zone.action.kind !== 'prediction') return zone
    const w = predictions[zone.action.index]
    return w ? { ...zone, label: w, inert: false } : { ...zone, label: '', inert: true }
  })
