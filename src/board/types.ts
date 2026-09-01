export type BoardAction =
  | { kind: 'append'; text: string }
  | { kind: 'space' }
  | { kind: 'deleteChar' }
  | { kind: 'deleteWord' }
  | { kind: 'clear' }
  | { kind: 'speak' }
  | { kind: 'go'; board: string }
  | { kind: 'prediction'; index: number }
  | { kind: 'none' }

export type Zone = { id: string; label: string; action: BoardAction; inert?: boolean }
export type Board = { id: string; zones: Zone[] }
export type BoardSet = Record<string, Board>
export type BoardState = { text: string; boardId: string; speakRequested: boolean }
export type ZoneCount = 9 | 6
export type Rect = { x: number; y: number; w: number; h: number }
