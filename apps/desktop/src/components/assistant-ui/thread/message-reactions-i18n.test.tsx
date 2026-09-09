// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import { ReactionBadge, ReactionPicker } from './message-reactions'

vi.stubGlobal(
  'ResizeObserver',
  class {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
)

afterEach(cleanup)

describe('message reaction localization', () => {
  it('localizes the full-picker action for Simplified Chinese users', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <ReactionPicker onOpenChange={() => {}} onSelect={() => {}} open>
          <button type="button">reaction anchor</button>
        </ReactionPicker>
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: '更多表情' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'More emoji' })).toBeNull()
  })

  it('localizes the retract and author labels', () => {
    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <ReactionBadge
          onRetract={vi.fn()}
          reactions={[
            { at: 1, author: 'user', emoji: '👍' },
            { at: 2, author: 'agent', emoji: '✨' }
          ]}
        />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: '移除 👍 回应' })).toBeTruthy()
    expect(screen.getByTitle('Aino 的回应')).toBeTruthy()
  })
})
