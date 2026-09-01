// after a selection the board changes under a pointer that has not moved, so the slot at the
// same grid position must not be selectable until the pointer has left it once
export const createLeaveGuard = () => {
  let blocked: number | null = null

  return {
    selected(slot: number) {
      blocked = slot
    },
    filter(slot: number | null): number | null {
      if (blocked === null) return slot
      if (slot === blocked) return null
      blocked = null
      return slot
    },
  }
}
