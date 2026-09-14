import { useStore } from '@nanostores/react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { WorktreeDialog } from '@/app/chat/sidebar/projects/worktree-dialog'
import type { HermesGitWorktree, HermesRepoStatus } from '@/global'
import { $repoStatusByCwd, $repoWorktreesByCwd } from '@/store/coding-status'
import { mainComposerScope } from '@/store/composer'
import { $projectTree, $startWorkSessionRequest, $worktreeDialog } from '@/store/projects'
import {
  $activeSessionId,
  $connection,
  $currentCwd,
  $messages,
  $selectedStoredSessionId,
  $sessions,
  setNewChatWorkspaceTarget
} from '@/store/session'
import { knownOwnerForSession } from '@/store/session-states'

import { CodingStatusRow } from './coding-row'

const desktop = window.hermesDesktop

const trees: HermesGitWorktree[] = [
  { path: '/repo', branch: 'main', isMain: true, detached: false, locked: false },
  { path: '/repo/.worktrees/feature', branch: 'feature', isMain: false, detached: false, locked: false }
]

const status: HermesRepoStatus = {
  branch: 'main',
  defaultBranch: 'main',
  detached: false,
  added: 0,
  removed: 0,
  ahead: 0,
  behind: 0,
  changed: 0,
  staged: 0,
  unstaged: 0,
  untracked: 0,
  conflicted: 0,
  files: []
}

function Harness() {
  const cwd = useStore($currentCwd)

  return (
    <>
      <CodingStatusRow repoPath={cwd} />
      <WorktreeDialog />
    </>
  )
}

beforeEach(() => {
  $activeSessionId.set(null)
  $selectedStoredSessionId.set(null)
  $connection.set(null)
  $messages.set([])
  $currentCwd.set('/repo')
  $startWorkSessionRequest.set(null)
  $worktreeDialog.set(null)
  $projectTree.set([{ id: 'project', label: 'Project', path: '/repo', repos: [], sessionCount: 0 }])
  $repoStatusByCwd.set({ '/repo': status, '/repo/.worktrees/feature': { ...status, branch: 'feature' } })
  $repoWorktreesByCwd.set({ '/repo': trees, '/repo/.worktrees/feature': trees })
  window.hermesDesktop = {
    ...desktop,
    git: {
      repoStatus: async () => status,
      worktreeList: async () => trees,
      baseBranchList: async () => [{ name: 'main', isDefault: true, isRemote: false }]
    }
  } as unknown as typeof window.hermesDesktop
})

afterEach(() => {
  cleanup()
  $worktreeDialog.set(null)
  $projectTree.set([])
  $selectedStoredSessionId.set(null)
  mainComposerScope.clear()
  $sessions.set([])
  window.hermesDesktop = desktop
})

it('selects local or worktree directories in place for drafts, and opens a new chat after sending', async () => {
  mainComposerScope.add({ id: 'folder', kind: 'folder', label: 'src', path: '/repo/src', refText: '@folder:src' })
  render(<Harness />)

  const openMode = () =>
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Work location' }), { button: 0, ctrlKey: false })

  openMode()
  fireEvent.click(screen.getByRole('menuitem', { name: 'feature' }))
  await waitFor(() => expect($currentCwd.get()).toBe('/repo/.worktrees/feature'))
  expect(screen.getByRole('button', { name: 'Work location' }).textContent).toContain('Worktree')
  expect(mainComposerScope.$attachments.get()[0]?.path).toBe('/repo/src')
  expect($startWorkSessionRequest.get()).toBeNull()

  openMode()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Local' }))
  await waitFor(() => expect($currentCwd.get()).toBe('/repo'))
  expect(mainComposerScope.$attachments.get()[0]?.refText).toBe('@folder:src')

  act(() => $selectedStoredSessionId.set('sent-conversation'))
  openMode()
  fireEvent.click(screen.getByRole('menuitem', { name: 'feature' }))
  expect($startWorkSessionRequest.get()).toMatchObject({ path: '/repo/.worktrees/feature', openTab: true })
  expect($currentCwd.get()).toBe('/repo')
})

it('does not adopt a worktree creation result after the originating draft was replaced', async () => {
  let finish!: (value: { path: string; branch: string; repoRoot: string }) => void
  window.hermesDesktop!.git!.worktreeAdd = () =>
    new Promise(resolve => {
      finish = resolve
    })
  render(<Harness />)
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Work location' }), { button: 0, ctrlKey: false })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Create worktree…' }))
  await screen.findByRole('dialog')
  fireEvent.change(screen.getByPlaceholderText('e.g. my-feature'), { target: { value: 'new-work' } })
  fireEvent.click(screen.getByRole('button', { name: 'New worktree' }))
  await waitFor(() => expect(finish).toBeTypeOf('function'))
  act(() => {
    setNewChatWorkspaceTarget('/another-project')
    $currentCwd.set('/another-project')
  })
  await act(async () => finish({ path: '/repo/.worktrees/new-work', branch: 'new-work', repoRoot: '/repo' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect($currentCwd.get()).toBe('/another-project')
  expect($startWorkSessionRequest.get()).toBeNull()
})

it('blocks a local profile-only conversation on a remote source with the same profile name', () => {
  $selectedStoredSessionId.set('local-conversation')
  $sessions.set([{ id: 'local-conversation', profile: 'default' } as ReturnType<typeof $sessions.get>[number]])
  expect(knownOwnerForSession('local-conversation')).toBe('default')
  $connection.set({ mode: 'remote', connectionId: 'remote-source', profile: 'default' } as NonNullable<
    ReturnType<typeof $connection.get>
  >)

  try {
    render(<Harness />)
    expect((screen.getByRole('button', { name: 'Work location' }) as HTMLButtonElement).disabled).toBe(true)
    expect($worktreeDialog.get()).toBeNull()
  } finally {
    $connection.set(null)
  }
})

it('does not offer a bare Git directory as a local working checkout', () => {
  $currentCwd.set('/repo/.worktrees/feature')
  $repoWorktreesByCwd.set({ '/repo/.worktrees/feature': [{ ...trees[0], branch: null }, trees[1]] })
  render(<Harness />)
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Work location' }), { button: 0, ctrlKey: false })
  expect(screen.queryByRole('menuitem', { name: 'Local' })).toBeNull()
  expect(screen.getByRole('menuitem', { name: 'feature' })).toBeTruthy()
})
