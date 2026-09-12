import { Codecs, persistentAtom } from '@/lib/persisted'

/** The layout-tree pane id for the unified session summary workspace. */
export const SUMMARY_PANE_ID = 'summary'

const OPEN_KEY = 'hermes.desktop.summaryOpen'

/** Persisted so reopening the desktop restores the user's last summary state. */
export const $summaryOpen = persistentAtom(OPEN_KEY, false, Codecs.bool)

export function openSummary(): void {
  $summaryOpen.set(true)
}

export function closeSummary(): void {
  $summaryOpen.set(false)
}

export function toggleSummary(): void {
  $summaryOpen.set(!$summaryOpen.get())
}
