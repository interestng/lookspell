import { writeFile } from 'node:fs/promises'

// first20hours/google-10000-english 20k list, ordered by frequency, from the google trillion word corpus
const URL = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt'
const res = await fetch(URL)
if (!res.ok) throw new Error(`fetch failed ${res.status}`)
const words = (await res.text())
  .split('\n')
  .map((w) => w.trim().toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w))
await writeFile('public/words.txt', words.join('\n'))
console.log(`wrote ${words.length} words`)
