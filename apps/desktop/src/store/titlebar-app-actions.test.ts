import { beforeEach, describe, expect, it } from 'vitest'

import {
  $titlebarAppActionsSide,
  setTitlebarAppActionsSide,
  TITLEBAR_APP_ACTIONS_DEFAULT,
  titlebarAppActionsClusterCounts
} from './titlebar-app-actions'

describe('titlebarAppActionsClusterCounts', () => {
  it('puts the three app actions on the right by default', () => {
    const right = titlebarAppActionsClusterCounts('right')
    const left = titlebarAppActionsClusterCounts('left')
    expect(left.left - right.left).toBe(3)
    expect(right.right - left.right).toBe(3)
    expect(left.left + left.right).toBe(right.left + right.right)
  })

  it('adds extras to the cluster they belong to', () => {
    for (const side of ['left', 'right'] as const) {
      const base = titlebarAppActionsClusterCounts(side)
      expect(titlebarAppActionsClusterCounts(side, 1, 2)).toEqual({ left: base.left + 1, right: base.right + 2 })
    }
  })
})

describe('$titlebarAppActionsSide', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setTitlebarAppActionsSide(TITLEBAR_APP_ACTIONS_DEFAULT)
  })

  it('defaults to right', () => {
    expect($titlebarAppActionsSide.get()).toBe('right')
  })

  it('persists left', () => {
    setTitlebarAppActionsSide('left')
    expect($titlebarAppActionsSide.get()).toBe('left')
    expect(window.localStorage.getItem('hermes.desktop.titlebarAppActions')).toBe('left')
  })
})
