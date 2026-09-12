import { SIDEBAR_COLLAPSE_MEDIA_QUERY } from '@/app/layout-constants'
import { PANE_TOGGLE_REVEAL_EVENT } from '@/components/pane-shell'
import { revealTreePane } from '@/components/pane-shell/tree/store'
import { matchesQuery } from '@/hooks/use-media-query'
import { Codecs, persistentAtom } from '@/lib/persisted'

import { $summaryVisible } from './summary-visibility'

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
  if ($summaryVisible.get()) {
    closeSummary()

    return
  }

  openSummary()

  if (matchesQuery(SIDEBAR_COLLAPSE_MEDIA_QUERY)) {
    window.dispatchEvent(new CustomEvent(PANE_TOGGLE_REVEAL_EVENT, { detail: { id: SUMMARY_PANE_ID, mode: 'open' } }))

    return
  }

  revealTreePane(SUMMARY_PANE_ID)
}
