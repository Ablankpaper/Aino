import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChatBarState } from '@/app/chat/composer/types'
import { I18nProvider } from '@/i18n'

import { ContextMenu } from './context-menu'

const state: ChatBarState = {
  model: { canSwitch: false, model: '', provider: '' },
  tools: { enabled: true, label: 'Add context' },
  voice: { active: false, enabled: false }
}

afterEach(() => cleanup())

describe('home composer context actions', () => {
  it('opens the existing prompt-snippets dialog from the dedicated Figma shortcut', () => {
    render(
      <I18nProvider configClient={null} initialLocale="en">
        <ContextMenu
          homeLayout
          onInsertText={vi.fn()}
          onOpenUrlDialog={vi.fn()}
          state={state}
        />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Prompt snippets…' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Prompt snippets' })).toBeTruthy()
  })
})
