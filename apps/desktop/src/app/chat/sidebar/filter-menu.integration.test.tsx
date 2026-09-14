// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { $sidebarListGroupIds, $sidebarWorkspaceNodeOpen, setSidebarGrouping } from '@/store/layout'
import { $projectTree } from '@/store/projects'

import { SidebarFilterMenu } from './filter-menu'

beforeEach(() => {
  setSidebarGrouping('date')
  $sidebarWorkspaceNodeOpen.set({})
  $sidebarListGroupIds.set(['list:today'])
  $projectTree.set([{ id: 'p_app', label: 'App', path: '/work/app', repos: [], sessionCount: 0 }])
})
afterEach(() => {
  cleanup()
  $projectTree.set([])
  $sidebarListGroupIds.set([])
  $sidebarWorkspaceNodeOpen.set({})
})

it('folds both simultaneously visible project and recent groups without touching pins', async () => {
  render(<SidebarFilterMenu />)
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Filters' }), { button: 0, ctrlKey: false })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Collapse all' }))
  expect($sidebarWorkspaceNodeOpen.get()).toEqual({ p_app: false, 'list:today': false })
})

it('keeps advanced workspace management out of the ordinary conversation filter menu', () => {
  render(<SidebarFilterMenu />)
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Filters' }), { button: 0, ctrlKey: false })
  expect(screen.queryByRole('menuitem', { name: 'Profile' })).toBeNull()
})
