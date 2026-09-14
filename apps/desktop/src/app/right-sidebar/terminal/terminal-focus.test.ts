import { describe, expect, it, vi } from 'vitest'

import { focusTerminalForActivation, terminalTabOwnsKeyboardFocus } from './terminal-focus'

describe('terminalTabOwnsKeyboardFocus', () => {
  it('recognizes a focused tab inside the terminal tab strip', () => {
    const tabs = document.createElement('div')
    tabs.dataset.terminalTabs = ''
    const tab = document.createElement('button')
    tab.setAttribute('role', 'tab')
    vi.spyOn(tab, 'matches').mockReturnValue(true)
    tabs.append(tab)
    document.body.append(tabs)
    tab.focus()

    expect(terminalTabOwnsKeyboardFocus()).toBe(true)
    tabs.remove()
  })

  it('does not claim focus for xterm or unrelated tabs', () => {
    const terminal = document.createElement('div')
    terminal.dataset.terminal = ''
    const xterm = document.createElement('textarea')
    terminal.append(xterm)
    document.body.append(terminal)
    xterm.focus()

    expect(terminalTabOwnsKeyboardFocus()).toBe(false)
    terminal.remove()
  })

  it('leaves focus in the strip during keyboard activation', () => {
    const tabs = document.createElement('div')
    tabs.dataset.terminalTabs = ''
    const tab = document.createElement('button')
    tab.setAttribute('role', 'tab')
    vi.spyOn(tab, 'matches').mockReturnValue(true)
    tabs.append(tab)
    document.body.append(tabs)
    tab.focus()
    const term = { focus: vi.fn() }

    focusTerminalForActivation(term)

    expect(term.focus).not.toHaveBeenCalled()
    tabs.remove()
  })

  it('focuses xterm for pointer or programmatic activation', () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    const term = { focus: vi.fn() }

    focusTerminalForActivation(term)

    expect(term.focus).toHaveBeenCalledOnce()
    outside.remove()
  })
})
