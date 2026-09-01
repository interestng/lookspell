import { describe, it, expect } from 'vitest'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings-store'

const mem = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('settings store', () => {
  it('returns defaults when empty or corrupt', () => {
    expect(loadSettings(mem())).toEqual(DEFAULT_SETTINGS)
    const s = mem()
    s.setItem('settings', '{bad')
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
  })
  it('round trips and fills missing keys', () => {
    const s = mem()
    saveSettings(s, { ...DEFAULT_SETTINGS, dwellMs: 1200 })
    expect(loadSettings(s).dwellMs).toBe(1200)
    s.setItem('settings', JSON.stringify({ inputMode: 'head' }))
    const loaded = loadSettings(s)
    expect(loaded.inputMode).toBe('head')
    expect(loaded.dwellMs).toBe(DEFAULT_SETTINGS.dwellMs)
  })
  it('clamps dwell into range', () => {
    const s = mem()
    s.setItem('settings', JSON.stringify({ dwellMs: 50 }))
    expect(loadSettings(s).dwellMs).toBe(600)
  })
})
