import { beforeEach, describe, expect, it, vi } from 'vitest'

// Ground-truth repro for "hiding the sidebar doesn't persist on reload": drive
// the REAL stores, then re-import them (fresh module state reading persisted
// localStorage) to simulate a ⌃R reload. `bind` mirrors the controller wiring.
async function loadStores() {
  const layout = await import('./layout')
  const tree = await import('@/components/pane-shell/tree/store')

  return {
    layout,
    tree,
    bind: () => tree.bindTreeSideVisibility('left', layout.$sidebarOpen, layout.setSidebarOpen),
    leftCollapsed: () => tree.$collapsedTreeSides.get().has('left')
  }
}

const reload = () => vi.resetModules() // fresh modules; localStorage is the carry-over

describe('sidebar collapse persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  it('restores a hidden sidebar after a reload', async () => {
    const s1 = await loadStores()
    s1.bind()
    s1.layout.setSidebarOpen(false)
    expect(s1.leftCollapsed()).toBe(true)

    reload()
    const s2 = await loadStores()
    expect(s2.layout.$sidebarOpen.get()).toBe(false) // persisted open:false survives
    s2.bind()
    expect(s2.leftCollapsed()).toBe(true) // and re-collapses
  })

  // The reported repro: a sidebar HIDDEN before a reset must be reopened by the
  // reset ("restore everything"); otherwise the stale-hidden state flips the
  // next ⌘B into a SHOW, and the user's hide never persists.
  it('reset reopens a hidden sidebar, so a later hide persists across reload', async () => {
    const s1 = await loadStores()
    const { group, split } = await import('@/components/pane-shell/tree/model')
    const { registry } = await import('@/contrib/registry')

    registry.registerMany([
      {
        id: 'sessions',
        area: 'panes',
        title: 'sessions',
        data: { placement: 'left' },
        render: () => null
      },
      {
        id: 'workspace',
        area: 'panes',
        title: 'workspace',
        data: { placement: 'main' },
        render: () => null
      }
    ])
    s1.tree.declareDefaultTree(split('row', [group(['sessions']), group(['workspace'])], [1, 3]))
    s1.bind()

    s1.layout.setSidebarOpen(false) // hidden BEFORE the reset
    expect(s1.leftCollapsed()).toBe(true)

    s1.tree.resetLayoutTree() // ⌘⇧ reset — restores everything, sidebar shown again
    expect(s1.layout.$sidebarOpen.get()).toBe(true)
    expect(s1.leftCollapsed()).toBe(false)

    s1.layout.toggleSidebarOpen() // ⌘B now genuinely hides
    expect(s1.layout.$sidebarOpen.get()).toBe(false)

    reload()
    const s2 = await loadStores()
    expect(s2.layout.$sidebarOpen.get()).toBe(false)
    s2.bind()
    expect(s2.leftCollapsed()).toBe(true)
  })

  it('restores a minimized sessions zone when the sidebar flag is already open', async () => {
    const s = await loadStores()
    const { group, split } = await import('@/components/pane-shell/tree/model')
    const { registry } = await import('@/contrib/registry')

    registry.registerMany([
      {
        id: 'sessions',
        area: 'panes',
        title: 'sessions',
        data: { placement: 'left' },
        render: () => null
      },
      {
        id: 'workspace',
        area: 'panes',
        title: 'workspace',
        data: { placement: 'main' },
        render: () => null
      }
    ])
    s.tree.declareDefaultTree(
      split('row', [group(['sessions'], { id: 'grp-sessions', minimized: true }), group(['workspace'])], [1, 3])
    )
    s.bind()

    expect(s.layout.$sidebarOpen.get()).toBe(true)
    expect(s.tree.isTreeSideVisible('left')).toBe(false)

    // The old toggle only flipped chat-sidebar.open, leaving this zone on its
    // 28px rail. One press must now restore the actual sessions pane.
    s.layout.toggleSidebarOpen()

    expect(s.layout.$sidebarOpen.get()).toBe(true)
    expect(s.tree.isTreeSideVisible('left')).toBe(true)
    const tree = s.tree.$layoutTree.get()
    expect(tree?.type).toBe('split')
    if (tree?.type === 'split') {
      expect(tree.children[0]).toMatchObject({ id: 'grp-sessions', minimized: false })
    }
  })
})
