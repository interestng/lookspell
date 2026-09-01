import { BOARDS_9 } from './boards-9'
import { BOARDS_6 } from './boards-6'
import type { BoardSet, ZoneCount } from './types'

export * from './types'
export { BOARDS_9 } from './boards-9'
export { BOARDS_6 } from './boards-6'
export { zoneCountFor, gridFor, zoneRects, hitTest } from './layout'
export { apply, initialState, resolveZones } from './reducer'

export const boardSetFor = (n: ZoneCount): BoardSet => (n === 9 ? BOARDS_9 : BOARDS_6)
