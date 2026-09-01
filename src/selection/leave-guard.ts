// after a selection the board changes under a pointer that has not moved, so the slot at the
// same grid position must not be selectable until the pointer has left it once.
// blockNext does the same for whatever slot the pointer lands on first, used when a screen
// appears under a resting gaze (end of calibration, an overlay closing)
export const createLeaveGuard = () => {
  let blocked: number | null = null
  let armNext = false

  return {
    selected(slot: number) {
      blocked = slot
      armNext = false
    },
    blockNext() {
      armNext = true
    },
    filter(slot: number | null): number | null {
      if (armNext && slot !== null) {
        armNext = false
        blocked = slot
        return null
      }
      if (blocked === null) return slot
      if (slot === blocked) return null
      blocked = null
      return slot
    },
  }
}
