import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { group, split } from '@/components/pane-shell/tree/model'
import { $dismissedPanes, $hiddenTreePanes, $layoutTree, isPaneVisible } from '@/components/pane-shell/tree/store'
import { registry } from '@/contrib/registry'

import { $summaryOpen, closeSummary, openSummary, SUMMARY_PANE_ID, toggleSummary } from './summary'

const disposers: (() => void)[] = []

describe('summary pane state', () => {
  beforeEach(() => {
    closeSummary()
    $dismissedPanes.set(new Set())
    $hiddenTreePanes.set(new Set())
    disposers.push(
      registry.register({
        area: 'panes',
        data: { placement: 'main' },
        id: 'workspace',
        render: () => null,
        title: 'workspace'
      }),
      registry.register({
        area: 'panes',
        data: { placement: 'right' },
        id: 'files',
        render: () => null,
        title: 'files'
      }),
      registry.register({
        area: 'panes',
        data: { placement: 'right' },
        id: SUMMARY_PANE_ID,
        render: () => null,
        title: 'summary'
      })
    )
  })

  afterEach(() => disposers.splice(0).forEach(dispose => dispose()))

  it('opens and closes without affecting other pane state', () => {
    expect($summaryOpen.get()).toBe(false)

    openSummary()
    expect($summaryOpen.get()).toBe(true)

    closeSummary()
    expect($summaryOpen.get()).toBe(false)
  })

  it('reveals a summary hidden behind a sibling tab on the first toggle', () => {
    $layoutTree.set(
      split('row', [
        group(['workspace'], { active: 'workspace', id: 'main' }),
        group(['files', SUMMARY_PANE_ID], { active: 'files', id: 'right' })
      ])
    )
    $summaryOpen.set(true)

    toggleSummary()

    expect($summaryOpen.get()).toBe(true)
    expect(isPaneVisible(SUMMARY_PANE_ID)).toBe(true)
  })
})
