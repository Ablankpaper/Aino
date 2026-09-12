import { atom } from 'nanostores'

/** Window-local card state, shared with actions that open Review or a preview. */
export const $summaryOpen = atom(false)

export function closeSummary(): void {
  $summaryOpen.set(false)
}
