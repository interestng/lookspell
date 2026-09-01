import type { PointerState } from '../types'

export const createPointerLayer = (el: HTMLElement) => ({
  move(p: PointerState) {
    el.hidden = false
    el.style.transform = `translate(${p.x}px, ${p.y}px)`
    el.toggleAttribute('data-unsure', !p.confident)
  },
  hide() {
    el.hidden = true
  },
})

export type PointerLayer = ReturnType<typeof createPointerLayer>
