const DEFAULT_LIMIT = 6

export const createPredictor = (words: string[]) => {
  const rank = new Map(words.map((w, i) => [w, i]))
  const sorted = [...words].sort()

  // first index in sorted whose word >= prefix
  const lowerBound = (prefix: string) => {
    let lo = 0
    let hi = sorted.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if ((sorted[mid] ?? '') < prefix) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  return {
    suggest(prefix: string, limit = DEFAULT_LIMIT): string[] {
      const p = prefix.toLowerCase()
      if (p === '') return words.slice(0, limit)
      const out: string[] = []
      for (let i = lowerBound(p); i < sorted.length; i++) {
        const w = sorted[i] ?? ''
        if (!w.startsWith(p)) break
        if (w !== p) out.push(w)
      }
      return out.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0)).slice(0, limit)
    },
  }
}

export const currentPrefix = (text: string): string => text.slice(text.lastIndexOf(' ') + 1)

export const loadWords = async (url: string): Promise<string[]> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`words list ${res.status}`)
  return (await res.text()).split('\n').filter(Boolean)
}
