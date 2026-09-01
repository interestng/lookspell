type Opts = { minCutoff?: number; beta?: number; dCutoff?: number }

// casiez et al. 2012. low cutoff at rest kills jitter, cutoff rises with speed so fast moves are not lagged
export const createOneEuro = ({ minCutoff = 1, beta = 0.007, dCutoff = 1 }: Opts = {}) => {
  let prevX: number | null = null
  let prevDx = 0
  let prevT = 0

  const alpha = (cutoff: number, dt: number) => {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dt)
  }

  return {
    filter(x: number, tMs: number): number {
      if (prevX === null) {
        prevX = x
        prevT = tMs
        return x
      }
      const dt = Math.max((tMs - prevT) / 1000, 1e-3)
      prevT = tMs
      const dx = (x - prevX) / dt
      const aD = alpha(dCutoff, dt)
      prevDx = aD * dx + (1 - aD) * prevDx
      const cutoff = minCutoff + beta * Math.abs(prevDx)
      const a = alpha(cutoff, dt)
      prevX = a * x + (1 - a) * prevX
      return prevX
    },
    reset() {
      prevX = null
      prevDx = 0
    },
  }
}
