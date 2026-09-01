export type DwellConfig = { dwellMs: number; graceMs: number; cooldownMs: number }

export const DEFAULT_DWELL: DwellConfig = { dwellMs: 900, graceMs: 150, cooldownMs: 500 }
export const DWELL_RANGE = { min: 600, max: 2000 }

export const BLINK = { threshold: 0.5, minMs: 350, maxMs: 1000 }
