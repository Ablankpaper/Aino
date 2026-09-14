import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import type { HermesGateway } from '@/hermes'
import { setPrimaryGateway } from '@/store/gateway'
import { $activeGatewayProfile, setShowAllProfiles } from '@/store/profile'
import { $projectDialog, $projects, $projectTree } from '@/store/projects'
import type { ProjectInfo } from '@/types/hermes'

import { ProjectDialog } from '../project-dialog'

const project: ProjectInfo = {
  id: 'p_folders',
  name: 'Folder project',
  slug: 'folder-project',
  description: null,
  icon: null,
  color: null,
  board_slug: null,
  archived: false,
  created_at: 0,
  primary_path: '/one',
  folders: [
    { path: '/one', label: null, is_primary: true, added_at: 0 },
    { path: '/two', label: null, is_primary: false, added_at: 0 }
  ]
}

afterEach(() => {
  cleanup()
  $projectDialog.set(null)
  $projects.set([])
  $projectTree.set([])
  $activeGatewayProfile.set('default')
  setPrimaryGateway(null)
})

function openManager(request: ReturnType<typeof vi.fn>) {
  setShowAllProfiles(false)
  setPrimaryGateway({ connectionState: 'open', request } as unknown as HermesGateway)
  $projectDialog.set({ mode: 'manage-folders', name: project.name, projectId: project.id })
  render(<ProjectDialog />)
}

it('uses server truth for the primary folder and removes only the folder registration', async () => {
  let saved = structuredClone(project)
  const writes: string[] = []
  openManager(
    vi.fn(async (method, params) => {
      if (method === 'projects.set_primary') {
        writes.push(method)
        saved = {
          ...saved,
          primary_path: params.path,
          folders: saved.folders.map(folder => ({
            ...folder,
            is_primary: folder.path === params.path
          }))
        }
      }

      if (method === 'projects.remove_folder') {
        writes.push(method)
        saved = { ...saved, folders: saved.folders.filter(folder => folder.path !== params.path) }
      }

      if (method === 'projects.tree') {
        return {
          projects: [
            {
              id: saved.id,
              path: saved.primary_path,
              label: saved.name,
              repos: [],
              sessionCount: 0
            }
          ],
          active_id: saved.id,
          scoped_session_ids: []
        }
      }

      return { project: saved }
    })
  )
  const dialog = await screen.findByRole('dialog', { name: 'Manage folders' })
  const second = (await within(dialog).findByText('/two')).closest('li')!
  fireEvent.click(within(second).getByRole('button', { name: 'Set as primary folder' }))
  await waitFor(() => expect($projects.get()[0]?.primary_path).toBe('/two'))
  expect(within(second).getByText('primary')).toBeTruthy()

  const first = within(dialog).getByText('/one').closest('li')!
  fireEvent.click(within(first).getByRole('button', { name: 'Remove' }))
  await waitFor(() => expect(within(dialog).queryByText('/one')).toBeNull())
  expect(saved.folders.map(folder => folder.path)).toEqual(['/two'])
  expect(writes).toEqual(['projects.set_primary', 'projects.remove_folder'])
})

it('ignores an old workspace response and refuses writes after switching profiles', async () => {
  let finish!: (result: unknown) => void

  const request = vi.fn(
    () =>
      new Promise(resolve => {
        finish = resolve
      })
  )

  openManager(request)
  await waitFor(() => expect(request).toHaveBeenCalledOnce())
  act(() => $activeGatewayProfile.set('other'))
  await act(async () => finish({ project }))
  expect($projects.get()).toEqual([])
  expect(screen.queryByText('/one')).toBeNull()
})
