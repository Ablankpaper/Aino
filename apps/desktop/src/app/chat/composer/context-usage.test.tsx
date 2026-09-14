import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { atom } from 'nanostores'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PRIMARY_SESSION_VIEW, SessionViewProvider } from '@/app/chat/session-view'
import { I18nProvider } from '@/i18n'
import { createClientSessionState } from '@/lib/chat-runtime'
import { $compactingSessions, setSessionCompacting } from '@/store/compaction'
import { $sessionStates } from '@/store/session-states'
import { stubResizeObserver } from '@/test/jsdom'
import type { ContextBreakdown } from '@/types/hermes'

import { ComposerContextUsage } from './context-usage'

const breakdown: ContextBreakdown = {
  categories: [{ id: 'conversation', label: 'Conversation', color: 'teal', tokens: 80_000 }],
  context_estimated: true,
  context_max: 100_000,
  context_percent: 80,
  context_used: 80_000,
  estimated_total: 80_000
}

beforeAll(stubResizeObserver)

afterEach(() => {
  cleanup()
  $sessionStates.set({})
  $compactingSessions.set({})
})

describe('composer context usage', () => {
  it('uses this composer session and keeps the ring, hover hint and details on the same measured usage', async () => {
    const sessionId = 'tile-runtime'
    const runtime = atom<string | null>(sessionId)
    const view = { ...PRIMARY_SESSION_VIEW, $runtimeId: runtime, $busy: atom(false) }
    const requestGateway = vi.fn().mockResolvedValue(breakdown)

    const usage = {
      calls: 1,
      input: 0,
      output: 0,
      total: 0,
      context_estimated: false,
      context_used: 10_000,
      context_max: 100_000,
      context_percent: 10
    }

    $sessionStates.set({
      [sessionId]: { ...createClientSessionState('tile-stored'), usage },
      'other-runtime': { ...createClientSessionState('other-stored'), usage: { ...usage, context_percent: 90 } }
    })

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <SessionViewProvider value={view}>
          <ComposerContextUsage enabled requestGateway={requestGateway} />
        </SessionViewProvider>
      </I18nProvider>
    )

    const button = screen.getByRole('button', { name: '上下文用量 · 已用 10%' })
    await waitFor(() =>
      expect(requestGateway).toHaveBeenCalledWith('session.context_breakdown', { session_id: sessionId })
    )
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('10')
    fireEvent.pointerMove(button, { pointerType: 'mouse' })
    const hint = await screen.findByRole('tooltip')
    expect(hint.textContent).toContain('已用 10%')
    expect(hint.textContent).toContain('10k / 100k')
    fireEvent.click(button)

    const dialog = screen.getByRole('dialog', { name: '上下文用量' })
    expect(within(dialog).getByText('已用 10%')).toBeTruthy()
    expect(within(dialog).getByText('对话')).toBeTruthy()
    act(() =>
      $sessionStates.set({
        ...$sessionStates.get(),
        [sessionId]: {
          ...$sessionStates.get()[sessionId],
          usage: { ...usage, context_used: 40_000, context_percent: 40 }
        }
      })
    )
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40')
    expect(within(dialog).getByText('已用 40%')).toBeTruthy()
    expect(requestGateway).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(button.ownerDocument, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('drops the previous owner data and skips estimates while compaction runs', async () => {
    const sessionId = 'runtime'
    const view = { ...PRIMARY_SESSION_VIEW, $runtimeId: atom<string | null>(sessionId), $busy: atom(false) }
    const firstOwner = vi.fn().mockResolvedValue(breakdown)
    let resolvePrevious!: (value: ContextBreakdown) => void

    const secondOwner = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolvePrevious = resolve
          })
      )
      .mockResolvedValue({ ...breakdown, context_used: 20_000, context_percent: 20 })

    const content = (requestGateway: typeof firstOwner) => (
      <I18nProvider configClient={null} initialLocale="zh">
        <SessionViewProvider value={view}>
          <ComposerContextUsage enabled requestGateway={requestGateway} />
        </SessionViewProvider>
      </I18nProvider>
    )

    const { rerender } = render(content(firstOwner))
    await screen.findByRole('button', { name: '上下文用量 · ~已用 80%' })

    rerender(content(secondOwner))
    expect(screen.getByRole('button', { name: '上下文用量 · 正在加载明细…' })).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()
    act(() => setSessionCompacting(sessionId, true))
    expect(screen.getByRole('button', { name: '上下文用量 · 正在压缩上下文…' })).toBeTruthy()
    await act(async () => resolvePrevious(breakdown))
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()
    expect(secondOwner).toHaveBeenCalledTimes(1)

    act(() => setSessionCompacting(sessionId, false))
    await screen.findByRole('button', { name: '上下文用量 · ~已用 20%' })
    expect(secondOwner).toHaveBeenCalledTimes(2)
    act(() => view.$runtimeId.set('new-runtime'))
    expect(screen.queryByRole('button', { name: /已用 20%/ })).toBeNull()
  })
})
