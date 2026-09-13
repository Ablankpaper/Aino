import { atom } from 'nanostores'

/** Window-local choice; only the titlebar toggle changes summary visibility. */
export const $summaryOpen = atom(false)

export function toggleSummary(): void {
  $summaryOpen.set(!$summaryOpen.get())
}
