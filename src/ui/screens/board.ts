import { gridFor, zoneRects, type Rect, type Zone, type ZoneCount } from '../../board'

const RING_R = 44
const CIRC = 2 * Math.PI * RING_R

const must = <T extends Element>(root: ParentNode, sel: string): T => {
  const el = root.querySelector<T>(sel)
  if (!el) throw new Error(`missing ${sel}`)
  return el
}

export const createBoardScreen = (root: HTMLElement, zoneCount: ZoneCount) => {
  const zonesEl = must<HTMLElement>(root, '#zones')
  const textEl = must<HTMLElement>(root, '#strip-text')
  const predsEl = must<HTMLElement>(root, '#strip-preds')
  const targetEl = must<HTMLElement>(root, '#strip-target')
  const textSpan = document.createElement('span')
  textEl.append(textSpan)
  const { cols, rows } = gridFor(zoneCount)
  zonesEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`
  zonesEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`

  let buttons: HTMLButtonElement[] = []
  let lastKey = ''

  // buttons are rebuilt only when the zone set changes, per-frame work is attribute updates only
  const ensureButtons = (zones: Zone[]) => {
    const key = zones.map((z) => z.id).join('|')
    if (key === lastKey) return
    lastKey = key
    zonesEl.replaceChildren()
    buttons = zones.map(() => {
      const b = document.createElement('button')
      b.className = 'zone'
      b.type = 'button'
      b.tabIndex = -1
      b.innerHTML = `<span class="zone-label"></span><svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="${RING_R}"/><circle class="ring-fill" cx="50" cy="50" r="${RING_R}"/></svg>`
      zonesEl.append(b)
      return b
    })
  }

  return {
    render(
      zones: Zone[],
      text: string,
      predictions: string[],
      hovered: string | null,
      progress: number,
    ) {
      ensureButtons(zones)
      zones.forEach((z, i) => {
        const b = buttons[i]
        if (!b) return
        const label = b.firstElementChild as HTMLElement
        if (label.textContent !== z.label) label.textContent = z.label
        b.toggleAttribute('data-inert', !!z.inert)
        const isHover = hovered === z.id
        b.toggleAttribute('data-hover', isHover)
        const fill = b.querySelector<SVGCircleElement>('.ring-fill')
        if (fill) fill.style.strokeDashoffset = String(isHover ? CIRC * (1 - progress) : CIRC)
      })
      if (textSpan.textContent !== text) textSpan.textContent = text
      const preds = predictions.slice(0, 3).join(' ')
      if (predsEl.textContent !== preds) predsEl.textContent = preds
    },
    rects(): Rect[] {
      const r = zonesEl.getBoundingClientRect()
      const gap = parseFloat(getComputedStyle(zonesEl).gap) || 0
      return zoneRects(zoneCount, { x: r.left, y: r.top, w: r.width, h: r.height }, gap)
    },
    setSpeaking(on: boolean) {
      textEl.toggleAttribute('data-speaking', on)
    },
    // brief confirmation on the chosen zone, re-triggered by removing and re-adding the attribute
    flash(index: number) {
      const b = buttons[index]
      if (!b) return
      b.removeAttribute('data-selected')
      void b.offsetWidth
      b.setAttribute('data-selected', '')
    },
    textAdded() {
      textEl.removeAttribute('data-added')
      void textEl.offsetWidth
      textEl.setAttribute('data-added', '')
    },
    setTargetPhrase(target: string | null) {
      targetEl.textContent = target ?? ''
      targetEl.hidden = target === null
    },
  }
}

export type BoardScreen = ReturnType<typeof createBoardScreen>
