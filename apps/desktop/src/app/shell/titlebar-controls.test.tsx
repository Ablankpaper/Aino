import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

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
import { stubResizeObserver } from '@/test/jsdom'

import { TitlebarControls } from './titlebar-controls'

// Exercise the real toolbar and floating surface, supplying only its wired body.
vi.mock('@/app/contrib/context', () => ({
  WiredPane: () => <p>Wired summary contents</p>
}))

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
  it('opens wired contents and dismisses by toggle, Escape and outside click without changing the layout', async () => {
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
    expect(screen.getByRole('dialog', { name: '会话摘要' })).toBeTruthy()
    expect(screen.getByText('Wired summary contents')).toBeTruthy()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('aria-expanded')).toBe('true')

    await act(async () => fireEvent.click(button))
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => fireEvent.click(button))
    await act(async () => fireEvent.keyDown(button.ownerDocument, { key: 'Escape' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(button.ownerDocument.activeElement).toBe(button))
    await act(async () => fireEvent.click(button))
    // Radix arms outside-pointer dismissal on the next task, after the opening event.
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
    const outside = screen.getByRole('button', { name: 'Outside' })
    await act(async () => {
      fireEvent.pointerDown(outside, { button: 0, pointerType: 'mouse' })
      fireEvent.click(outside)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect($layoutTree.get()).toBe(tree)
    expect($terminals.get()).toBe(terminals)
    expect($activeTerminalId.get()).toBe('live-shell')
  })

  it('closes explicitly and starts closed when the toolbar remounts', async () => {
    const toolbar = (
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <TitlebarControls />
        </MemoryRouter>
      </I18nProvider>
    )

    const view = render(toolbar)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '会话摘要' })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '关闭摘要' })))
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '会话摘要' })))
    view.unmount()
    render(toolbar)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: '会话摘要' }).getAttribute('aria-expanded')).toBe('false')
  })
})
