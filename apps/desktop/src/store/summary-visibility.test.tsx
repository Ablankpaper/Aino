import { useStore } from '@nanostores/react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { group, split } from '@/components/pane-shell/tree/model'
import { NarrowOverlays } from '@/components/pane-shell/tree/renderer/narrow-overlays'
import {
  $collapsedTreeSides,
  $dismissedPanes,
  $hiddenTreePanes,
  $layoutTree,
  $narrowViewport,
  setTreePaneHidden,
  setTreeSideCollapsed
} from '@/components/pane-shell/tree/store'
import { registry } from '@/contrib/registry'
import { stubResizeObserver } from '@/test/jsdom'

import { $summaryOpen, closeSummary, openSummary, SUMMARY_PANE_ID, toggleSummary } from './summary'
import { $summaryVisible } from './summary-visibility'

const disposers: (() => void)[] = []

function SummaryToggle() {
  const visible = useStore($summaryVisible)

  return (
    <button aria-pressed={visible} onClick={toggleSummary}>
      Summary
    </button>
  )
}

beforeAll(stubResizeObserver)

beforeEach(() => {
  $narrowViewport.set(false)
  $collapsedTreeSides.set(new Set())
  $dismissedPanes.set(new Set())
  $hiddenTreePanes.set(new Set())
  closeSummary()
  disposers.push(
    registry.register({ area: 'panes', data: { placement: 'main' }, id: 'workspace', render: () => null }),
    registry.register({
      area: 'panes',
      data: { collapsible: true, placement: 'right' },
      id: SUMMARY_PANE_ID,
      render: () => <div>Summary content</div>
    }),
    $summaryOpen.listen(open => setTreePaneHidden(SUMMARY_PANE_ID, !open))
  )
  $layoutTree.set(split('row', [group(['workspace']), group([SUMMARY_PANE_ID])]))
  setTreePaneHidden(SUMMARY_PANE_ID, true)
})

afterEach(() => {
  cleanup()
  disposers.splice(0).forEach(dispose => dispose())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  $narrowViewport.set(false)
  $collapsedTreeSides.set(new Set())
  $layoutTree.set(null)
})

describe('summary rendered visibility', () => {
  it('reveals a collapsed whole column on the first click instead of closing its active tab', () => {
    openSummary()
    setTreeSideCollapsed('right', true)
    render(<SummaryToggle />)
    const button = screen.getByRole('button', { name: 'Summary' })

    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect($collapsedTreeSides.get().has('right')).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('opens a previously closed narrow overlay once and tracks both toggle and Escape dismissal', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    )
    $narrowViewport.set(true)
    render(
      <>
        <SummaryToggle />
        <NarrowOverlays />
      </>
    )
    const button = screen.getByRole('button', { name: 'Summary' })

    fireEvent.click(button)
    expect(await screen.findByText('Summary content')).toBeTruthy()
    await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'))
    fireEvent.click(button)
    await waitFor(() => expect(screen.queryByText('Summary content')).toBeNull())
    expect(button.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(button)
    expect(await screen.findByText('Summary content')).toBeTruthy()
    act(() => fireEvent.keyDown(window, { key: 'Escape' }))
    await waitFor(() => expect(screen.queryByText('Summary content')).toBeNull())
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })
})
