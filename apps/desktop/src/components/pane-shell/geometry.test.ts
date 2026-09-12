import { afterEach, describe, expect, it, vi } from 'vitest'

import { publishWorkspaceGeometry } from './geometry'

describe('publishWorkspaceGeometry', () => {
  let mutationCallback: MutationCallback | undefined

  afterEach(() => {
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
})
