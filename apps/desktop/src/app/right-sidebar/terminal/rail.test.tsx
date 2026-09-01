import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'
import { $bindings } from '@/store/keybinds'

import { TerminalRail } from './rail'
import { $activeTerminalId, $terminals } from './terminals'

describe('TerminalRail', () => {
  beforeEach(() => {
    $terminals.set([{ auto: true, cwd: 'C:\\repo', id: 'term-1', kind: 'user', title: 'PowerShell' }])
    $activeTerminalId.set('term-1')
    $bindings.set({ ...$bindings.get(), 'view.showTerminal': ['ctrl+`'] })
  })

  afterEach(() => {
    cleanup()
    $terminals.set([])
    $activeTerminalId.set(null)
  })

  it('keeps a hotkey label inline inside the portaled tooltip decoration', async () => {
    const view = render(<TerminalRail />)

    fireEvent.pointerMove(screen.getByRole('tab', { name: '1. PowerShell' }), { pointerType: 'mouse' })
    await screen.findByRole('tooltip')

    const content = document.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
    const label = content?.firstElementChild?.firstElementChild

    expect(content).not.toBeNull()
    expect(view.container.contains(content)).toBe(false)
    expect(label?.classList.contains('inline-flex')).toBe(true)
    expect(label?.classList.contains('flex')).toBe(false)
  })

  it('⌘-click closes the tab; a plain click selects it', () => {
    $terminals.set([...$terminals.get(), { auto: true, cwd: 'C:\\repo', id: 'term-2', kind: 'user', title: 'zsh' }])

    render(<TerminalRail />)

    fireEvent.click(screen.getByRole('tab', { name: '2. zsh' }), { metaKey: true })
    expect($terminals.get().map(term => term.id)).toEqual(['term-1'])

    fireEvent.click(screen.getByRole('tab', { name: '1. PowerShell' }))
    expect($activeTerminalId.get()).toBe('term-1')
    expect($terminals.get()).toHaveLength(1)
  })

  it('localizes an untouched automatic terminal title without changing shell names', () => {
    $terminals.set([
      { auto: true, cwd: 'C:\\repo', id: 'term-default', kind: 'user', title: 'Terminal' },
      { auto: true, cwd: 'C:\\repo', id: 'term-shell', kind: 'user', title: 'PowerShell' },
      { auto: false, cwd: 'C:\\repo', id: 'term-custom', kind: 'user', title: 'Terminal' }
    ])

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <TerminalRail />
      </I18nProvider>
    )

    expect(screen.getByRole('tab', { name: '1. 终端' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '2. PowerShell' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '3. Terminal' })).toBeTruthy()
  })
})
