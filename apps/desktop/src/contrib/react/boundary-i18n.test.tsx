// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import { ContribBoundary } from './boundary'

function Bomb(): ReactNode {
  throw new Error('contribution exploded')
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('contribution error boundary localization', () => {
  it('localizes the pane failure title and retry action', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <ContribBoundary id="demo-pane" variant="pane">
          <Bomb />
        </ContribBoundary>
      </I18nProvider>
    )

    expect(screen.getByText('面板“demo-pane”渲染失败')).toBeTruthy()
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('localizes the chip tooltip label while preserving the plugin error detail', async () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <ContribBoundary id="demo-chip" variant="chip">
          <Bomb />
        </ContribBoundary>
      </I18nProvider>
    )

    fireEvent.pointerMove(screen.getByRole('button', { name: 'demo-chip' }), { pointerType: 'mouse' })
    expect((await screen.findByRole('tooltip')).textContent).toContain('“demo-chip”渲染失败：contribution exploded')
  })
})
