import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { registry } from '@/contrib/registry'

import { $layoutEditMode } from '../../edit-mode'
import { group } from '../model'

import { TreeGroup } from './tree-group'

let root: null | Root = null
let container: HTMLDivElement | null = null
const disposers: (() => void)[] = []

function render(ui: ReactNode) {
  if (!container) {
    container = globalThis.document.createElement('div')
    globalThis.document.body.append(container)
    root = createRoot(container)
  }

  act(() => {
    root!.render(ui)
  })
}

beforeAll(() => {
  class TestResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  // jsdom lacks CSS.escape, which tab-strip-scroll uses in a layout effect.
  vi.stubGlobal('CSS', { ...globalThis.CSS, escape: (value: string) => value })
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  HTMLElement.prototype.scrollIntoView ??= () => undefined
})

beforeEach(() => {
  window.localStorage.clear()
  $layoutEditMode.set(false)

  for (const [id, title, data] of [
    ['workspace', 'Workspace', { placement: 'main', uncloseable: true }],
    ['session-tile:a', 'Session A', { placement: 'main' }],
    ['session-tile:b', 'Session B', { placement: 'main' }]
  ] as const) {
    disposers.push(registry.register({ area: 'panes', data, id, render: () => null, title }))
  }
})

afterEach(() => {
  if (root) {
    act(() => root!.unmount())
  }

  container?.remove()
  disposers.splice(0).forEach(dispose => dispose())
  root = null
  container = null
})

describe('single-session header', () => {
  it('shows only the active session title in a chat-only zone', () => {
    const node = group(['workspace', 'session-tile:a', 'session-tile:b'], {
      active: 'session-tile:b',
      id: 'grp-chat'
    })

    render(<TreeGroup node={node} parentAxis="column" />)

    expect(globalThis.document.querySelector('[data-zone-tabstrip="grp-chat"]')).toBeTruthy()
    expect(globalThis.document.querySelectorAll('[data-tree-tab]')).toHaveLength(1)
    expect(globalThis.document.querySelector('[data-tree-tab="session-tile:b"]')?.textContent).toContain('Session B')
    expect(globalThis.document.querySelector('[data-tree-tab="session-tile:a"]')).toBeNull()
    expect(globalThis.document.querySelector('[data-tree-tab="session-tile:b"] button[aria-label="Close"]')).toBeNull()
  })

  it('shows the workspace title as the single header when the workspace is active', () => {
    const node = group(['workspace', 'session-tile:a'], {
      active: 'workspace',
      id: 'grp-primary'
    })

    render(<TreeGroup node={node} parentAxis="column" />)

    // The in-surface ChatHeader is display:none inside layout trees, so the
    // zone header owns the routed session's title — one tab, not a strip.
    expect(globalThis.document.querySelector('[data-zone-tabstrip="grp-primary"]')).toBeTruthy()
    expect(globalThis.document.querySelectorAll('[data-tree-tab]')).toHaveLength(1)
    expect(globalThis.document.querySelector('[data-tree-tab="workspace"]')?.textContent).toContain('Workspace')
    expect(globalThis.document.querySelector('[data-tree-tab="session-tile:a"]')).toBeNull()
  })

  it('titles a workspace-only zone instead of leaving a blank header band', () => {
    const node = group(['workspace'], { active: 'workspace', id: 'grp-solo' })

    render(<TreeGroup node={node} parentAxis="column" />)

    expect(globalThis.document.querySelectorAll('[data-tree-tab]')).toHaveLength(1)
    expect(globalThis.document.querySelector('[data-current-session-title]')).toBeTruthy()
  })

  it('pairs the single title with the pane headerMenu kebab, and only there', () => {
    disposers.push(
      registry.register({
        area: 'panes',
        data: {
          headerMenu: () => (
            <button aria-label="Session actions" type="button">
              ⋯
            </button>
          ),
          placement: 'main'
        },
        id: 'session-tile:c',
        render: () => null,
        title: 'Session C'
      })
    )

    const kebab = () => document.querySelector('button[aria-label="Session actions"]')

    render(
      <TreeGroup
        node={group(['workspace', 'session-tile:c'], { active: 'session-tile:c', id: 'grp-kebab' })}
        parentAxis="column"
      />
    )
    expect(kebab()).toBeTruthy()

    // Edit mode keeps the full strip — the kebab belongs to the single header.
    act(() => $layoutEditMode.set(true))
    expect(kebab()).toBeNull()
    act(() => $layoutEditMode.set(false))

    // A mixed zone keeps the shared strip, whose menu surface is right-click.
    const disposePreview = registry.register({
      area: 'panes',
      data: { placement: 'main' },
      id: 'preview-tile:kebab',
      render: () => null,
      title: 'Preview'
    })
    disposers.push(disposePreview)

    render(
      <TreeGroup
        node={group(['workspace', 'session-tile:c', 'preview-tile:kebab'], {
          active: 'session-tile:c',
          id: 'grp-kebab-mixed'
        })}
        parentAxis="column"
      />
    )
    expect(kebab()).toBeNull()
  })

  it('keeps every pane tab available while editing the layout', () => {
    $layoutEditMode.set(true)

    const node = group(['workspace', 'session-tile:a', 'session-tile:b'], {
      active: 'session-tile:b',
      id: 'grp-chat-edit'
    })

    render(<TreeGroup node={node} parentAxis="column" />)

    expect(globalThis.document.querySelectorAll('[data-tree-tab]')).toHaveLength(3)
  })

  it('does not collapse a mixed chat and non-chat zone into one title', () => {
    const disposePreview = registry.register({
      area: 'panes',
      data: { placement: 'main' },
      id: 'preview-tile:test',
      render: () => null,
      title: 'Preview'
    })

    disposers.push(disposePreview)

    const node = group(['workspace', 'session-tile:a', 'preview-tile:test'], {
      active: 'workspace',
      id: 'grp-mixed'
    })

    render(<TreeGroup node={node} parentAxis="column" />)

    expect(globalThis.document.querySelectorAll('[data-tree-tab]')).toHaveLength(3)
  })
})
