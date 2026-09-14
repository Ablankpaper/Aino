import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { stubResizeObserver } from '@/test/jsdom'

import { publishWorkspaceGeometry } from './geometry'

describe('publishWorkspaceGeometry', () => {
  let mutationCallback: MutationCallback | undefined

  afterEach(() => {
    cleanup()
    document.body.replaceChildren()
    document.documentElement.style.removeProperty('--workspace-left')
    document.documentElement.style.removeProperty('--workspace-right')
    vi.unstubAllGlobals()
  })

  it('measures the workspace when its anchor mounts after the publisher starts', () => {
    class TestResizeObserver {
      constructor(_callback: ResizeObserverCallback) {}

      disconnect() {}
      observe() {}
      unobserve() {}
    }

    class TestMutationObserver {
      constructor(callback: MutationCallback) {
        mutationCallback = callback
      }

      disconnect() {}
      observe = vi.fn()
      takeRecords(): MutationRecord[] {
        return []
      }
    }

    vi.stubGlobal('ResizeObserver', TestResizeObserver)
    vi.stubGlobal('MutationObserver', TestMutationObserver)

    const dispose = publishWorkspaceGeometry()
    const workspace = document.createElement('main')
    workspace.dataset.sessionAnchor = 'workspace'
    const workspaceRight = window.innerWidth
    workspace.getBoundingClientRect = () =>
      ({
        bottom: 900,
        height: 857,
        left: 245,
        right: workspaceRight,
        top: 43,
        width: workspaceRight - 245,
        x: 245,
        y: 43
      }) as DOMRect
    document.body.append(workspace)

    mutationCallback?.([], {} as MutationObserver)

    expect(document.documentElement.style.getPropertyValue('--workspace-left')).toBe('245px')
    expect(document.documentElement.style.getPropertyValue('--workspace-right')).toBe('0px')

    dispose()
  })

  it('keeps flipped navigation chrome aligned when a summary reserves the window right edge', () => {
    stubResizeObserver()
    const { container } = render(createElement('div'))
    const ownerDocument = container.ownerDocument
    const viewportWidth = ownerDocument.defaultView!.innerWidth

    const rect = (left: number, top: number, width: number, height: number) =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect

    const titlebar = ownerDocument.createElement('div')
    titlebar.dataset.slot = 'app-titlebar'
    titlebar.getBoundingClientRect = () => rect(0, 0, viewportWidth, 43)
    const layout = ownerDocument.createElement('div')
    layout.dataset.slot = 'summary-workspace-main'
    layout.getBoundingClientRect = () => rect(0, 43, viewportWidth - 344, 800)
    const navigation = ownerDocument.createElement('aside')
    navigation.dataset.navigationRail = ''
    navigation.getBoundingClientRect = () => rect(viewportWidth - 344 - 245, 43, 245, 800)
    layout.append(navigation)
    container.append(titlebar, layout)

    const dispose = publishWorkspaceGeometry()

    try {
      expect(titlebar.dataset.titlebarRail).toBe('right')
      expect(titlebar.style.getPropertyValue('--titlebar-rail-left')).toBe(`${viewportWidth - 344 - 245}px`)
      expect(titlebar.style.getPropertyValue('--titlebar-rail-width')).toBe('245px')
    } finally {
      dispose()
    }
  })
})
