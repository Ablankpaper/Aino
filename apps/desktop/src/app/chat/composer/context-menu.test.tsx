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

describe('composer context actions', () => {
  it('keeps prompt snippets reachable through the shared attachment menu', () => {
    const onInsertText = vi.fn()
    render(
      <I18nProvider configClient={null} initialLocale="en">
        <ContextMenu onInsertText={onInsertText} onOpenUrlDialog={vi.fn()} state={state} />
      </I18nProvider>
    )

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Add context' }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Prompt snippets…' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Prompt snippets' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Code review/ }))
    expect(onInsertText).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
