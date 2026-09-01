export const createOverlay = (el: HTMLElement) => ({
  el,
  show(html: string): HTMLElement {
    el.innerHTML = html
    el.hidden = false
    return el
  },
  hide() {
    el.hidden = true
    el.innerHTML = ''
  },
  visible: () => !el.hidden,
  // elements with class gz are gaze targets, the main loop dwell-clicks them
  targets: () => Array.from(el.querySelectorAll<HTMLElement>('.gz')),
})

export type Overlay = ReturnType<typeof createOverlay>

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
