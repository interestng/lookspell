// running median over the last n values, kills single-frame spikes before the one euro filter sees them
export const createMedian = (n: number) => {
  const buf: number[] = []
  return {
    push(x: number): number {
      buf.push(x)
      if (buf.length > n) buf.shift()
      const s = [...buf].sort((a, b) => a - b)
      const m = s.length >> 1
      return s.length % 2 ? (s[m] ?? x) : ((s[m - 1] ?? x) + (s[m] ?? x)) / 2
    },
    reset() {
      buf.length = 0
    },
  }
}
