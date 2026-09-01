export const createSpeaker = () => {
  const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null
  let voiceName: string | null = null
  let listener: ((speaking: boolean) => void) | null = null

  const pick = () => {
    const all = synth?.getVoices() ?? []
    return (
      all.find((v) => v.name === voiceName) ?? all.find((v) => v.lang.startsWith('en')) ?? all[0]
    )
  }

  return {
    available: synth !== null,
    voices: () => synth?.getVoices() ?? [],
    setVoice(name: string | null) {
      voiceName = name
    },
    onStateChange(cb: (speaking: boolean) => void) {
      listener = cb
    },
    speak(text: string) {
      if (!synth || !text.trim()) return
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      const v = pick()
      if (v) u.voice = v
      u.rate = 0.95
      u.onstart = () => listener?.(true)
      u.onend = () => listener?.(false)
      u.onerror = () => listener?.(false)
      synth.speak(u)
    },
  }
}

export type Speaker = ReturnType<typeof createSpeaker>
