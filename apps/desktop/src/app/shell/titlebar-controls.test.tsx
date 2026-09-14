import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { $terminalTakeover, setTerminalTakeover } from '@/app/right-sidebar/store'
import { $activeTerminalId, $terminals } from '@/app/right-sidebar/terminal/terminals'
import { group, split } from '@/components/pane-shell/tree/model'
import {
  $dismissedPanes,
  $hiddenTreePanes,
  $layoutTree,
  bindToolPaneCollapse,
  isPaneVisible,
  togglePaneVisible
} from '@/components/pane-shell/tree/store'
import { I18nProvider } from '@/i18n'
import { $summaryOpen } from '@/store/summary'
import { stubResizeObserver } from '@/test/jsdom'

import { TitlebarControls } from './titlebar-controls'

beforeAll(() => {
  stubResizeObserver()
  bindToolPaneCollapse(
    'terminal',
    $terminalTakeover,
    () => setTerminalTakeover(false),
    () => setTerminalTakeover(true)
  )
})

afterEach(() => {
  cleanup()
  setTerminalTakeover(false)
  $terminals.set([])
  $activeTerminalId.set(null)
  $summaryOpen.set(false)
})

describe('titlebar terminal toggle', () => {
  it('tracks the same visible pane as the keyboard command without replacing terminal tabs', () => {
    $dismissedPanes.set(new Set())
    $hiddenTreePanes.set(new Set())
    $layoutTree.set(split('column', [group(['workspace']), group(['terminal'], { minimized: true })]))
    const terminals = [{ auto: true, cwd: '/project', id: 'running-shell', kind: 'user' as const, title: 'zsh' }]
    $terminals.set(terminals)
    $activeTerminalId.set('running-shell')

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <TitlebarControls />
        </MemoryRouter>
      </I18nProvider>
    )

    expect(screen.queryByRole('button', { name: '打开设置' })).toBeNull()
    expect(screen.getByRole('button', { name: '布局编辑器' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '显示终端' }))
    expect(isPaneVisible('terminal')).toBe(true)
    expect(screen.getByRole('button', { name: '隐藏终端' }).getAttribute('aria-pressed')).toBe('true')

    act(() => togglePaneVisible('terminal'))
    expect(screen.getByRole('button', { name: '显示终端' }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: '显示终端' }))
    fireEvent.click(screen.getByRole('button', { name: '隐藏终端' }))
    expect(isPaneVisible('terminal')).toBe(false)
    expect($terminals.get()).toBe(terminals)
    expect($activeTerminalId.get()).toBe('running-shell')
  })
})

describe('titlebar summary toggle', () => {
  it('keeps summary open until toggled without replacing the saved layout or terminal tabs', async () => {
    const tree = split('column', [group(['workspace']), group(['terminal'])])
    $layoutTree.set(tree)
    const terminals = [{ auto: true, cwd: '/project', id: 'live-shell', kind: 'user' as const, title: 'zsh' }]
    $terminals.set(terminals)
    $activeTerminalId.set('live-shell')

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <TitlebarControls />
          <button type="button">Outside</button>
        </MemoryRouter>
      </I18nProvider>
    )

    const button = screen.getByRole('button', { name: '会话摘要' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    await act(async () => fireEvent.click(button))
    expect($summaryOpen.get()).toBe(true)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('aria-expanded')).toBe('true')

    await act(async () => fireEvent.keyDown(button.ownerDocument, { key: 'Escape' }))
    expect($summaryOpen.get()).toBe(true)
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
    const outside = screen.getByRole('button', { name: 'Outside' })
    await act(async () => {
      fireEvent.pointerDown(outside, { button: 0, pointerType: 'mouse' })
      fireEvent.click(outside)
    })
    expect($summaryOpen.get()).toBe(true)

    await act(async () => fireEvent.click(button))
    expect($summaryOpen.get()).toBe(false)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect($layoutTree.get()).toBe(tree)
    expect($terminals.get()).toBe(terminals)
    expect($activeTerminalId.get()).toBe('live-shell')
  })

  it('retains the window-local summary choice when the toolbar remounts', async () => {
    const toolbar = (
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <TitlebarControls />
        </MemoryRouter>
      </I18nProvider>
    )

    const view = render(toolbar)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '会话摘要' })))
    view.unmount()
    render(toolbar)

    expect($summaryOpen.get()).toBe(true)
    expect(screen.getByRole('button', { name: '会话摘要' }).getAttribute('aria-expanded')).toBe('true')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '会话摘要' })))
    expect($summaryOpen.get()).toBe(false)
  })
})
