import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HermesRepoStatus, HermesReviewFile, HermesReviewShipInfo } from '@/global'
import { I18nProvider } from '@/i18n'
import { $activeGatewayProfile } from '@/store/profile'
import { $projectTree } from '@/store/projects'
import { $reviewFiles, $reviewOpen, $reviewRevertTarget, $reviewScopeCwd, $reviewShipInfo } from '@/store/review'
import { $currentCwd, $selectedStoredSessionId, $workspaceCwdOwner } from '@/store/session'
import { $workspaceChangeTick } from '@/store/workspace-events'

import { ReviewRevertDialog } from '../review/revert-dialog'

import { ChangesSection } from './changes-section'
import { GitSection } from './git-section'

import { SummaryPane } from './index'

const cleanStatus: HermesRepoStatus = {
  added: 0,
  ahead: 1,
  behind: 0,
  branch: 'summary-main',
  changed: 0,
  conflicted: 0,
  defaultBranch: 'main',
  detached: false,
  files: [],
  removed: 0,
  staged: 0,
  unstaged: 0,
  untracked: 0
}

const file = (path: string): HermesReviewFile => ({ added: 2, path, removed: 1, staged: false, status: 'M' })

function renderWithQuery(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })

  return render(
    <I18nProvider configClient={null} initialLocale="en">
      <MemoryRouter>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    </I18nProvider>
  )
}

function stubGit(
  options: {
    list?: (cwd: string) => Promise<{ base: null; files: HermesReviewFile[] }>
    repoStatus?: (cwd: string) => Promise<HermesRepoStatus | null>
    shipInfo?: (cwd: string) => Promise<HermesReviewShipInfo>
  } = {}
) {
  const review = {
    list: vi.fn(options.list ?? (async () => ({ base: null, files: [] }))),
    revParse: vi.fn(async () => '0123456789abcdef'),
    shipInfo: vi.fn(options.shipInfo ?? (async () => ({ ghReady: false, pr: null }))),
    stage: vi.fn(async () => undefined),
    unstage: vi.fn(async () => undefined),
    revert: vi.fn(async () => undefined),
    push: vi.fn(async () => undefined)
  }

  const git = {
    repoStatus: vi.fn(options.repoStatus ?? (async () => cleanStatus)),
    review
  }

  ;(window as unknown as { hermesDesktop: unknown }).hermesDesktop = { git }

  return { git, review }
}

beforeEach(() => {
  $currentCwd.set('/summary-repo')
  $selectedStoredSessionId.set('summary-session')
  $workspaceCwdOwner.set('summary-session')
  $workspaceChangeTick.set(0)
  $activeGatewayProfile.set('default')
  $projectTree.set([
    { id: 'summary-project', label: 'Summary project', path: '/summary-repo', repos: [], sessionCount: 1 }
  ])
  $reviewOpen.set(false)
  $reviewScopeCwd.set('/pinned-review-repo')
  $reviewFiles.set([file('pinned-review.ts')])
  $reviewShipInfo.set({ ghReady: true, pr: { number: 99, state: 'OPEN', url: 'https://example.com/99' } })
  $reviewRevertTarget.set(undefined)
})

afterEach(() => {
  cleanup()
  delete (window as unknown as { hermesDesktop?: unknown }).hermesDesktop
})

describe('Summary Git scope', () => {
  it('does not issue Git reads when no project owns the session cwd', async () => {
    const { git, review } = stubGit()
    $projectTree.set([])

    renderWithQuery(
      <>
        <ChangesSection />
        <GitSection />
      </>
    )

    expect(screen.getAllByText('No project is open')).toHaveLength(2)
    expect(git.repoStatus).not.toHaveBeenCalled()
    expect(review.list).not.toHaveBeenCalled()
    expect(review.shipInfo).not.toHaveBeenCalled()
  })

  it('loads and stages the selected session repo even when Review is pinned elsewhere', async () => {
    const { review } = stubGit({ list: async cwd => ({ base: null, files: [file(`${cwd.slice(1)}.ts`)] }) })

    renderWithQuery(<ChangesSection />)

    expect(await screen.findByText('summary-repo.ts')).toBeTruthy()
    expect(screen.queryByText('pinned-review.ts')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Stage file: summary-repo.ts' }))
    await waitFor(() => expect(review.stage).toHaveBeenCalledWith('/summary-repo', 'summary-repo.ts'))
    await waitFor(() => expect(review.list).toHaveBeenCalledTimes(2))
  })

  it('refreshes visible changes after a workspace edit', async () => {
    let files = [file('before.ts')]
    stubGit({ list: async () => ({ base: null, files }) })
    renderWithQuery(<ChangesSection />)

    expect(await screen.findByText('before.ts')).toBeTruthy()
    files = [file('after.ts')]
    act(() => $workspaceChangeTick.set(1))

    expect(await screen.findByText('after.ts')).toBeTruthy()
    expect(screen.queryByText('before.ts')).toBeNull()
  })

  it('shows a retryable error instead of presenting a failed read as no changes', async () => {
    let fails = true
    stubGit({
      list: async () => {
        if (fails) {
          throw new Error('git list failed')
        }

        return { base: null, files: [file('recovered.ts')] }
      }
    })
    renderWithQuery(<ChangesSection />)

    expect(await screen.findByText('Changes are temporarily unavailable')).toBeTruthy()
    fails = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('recovered.ts')).toBeTruthy()
  })

  it('keeps an empty changes read refreshable', async () => {
    const { review } = stubGit()
    renderWithQuery(<ChangesSection />)

    expect(await screen.findByText('No uncommitted changes')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(review.list).toHaveBeenCalledTimes(2))
  })

  it('pushes the selected session repo rather than Review pinned cwd', async () => {
    const { review } = stubGit()
    renderWithQuery(<GitSection />)

    const push = await screen.findByRole('button', { name: 'Push' })
    fireEvent.click(push)

    await waitFor(() => expect(review.push).toHaveBeenCalledWith('/summary-repo'))
  })

  it('shows a retryable error instead of presenting a failed status read as no repository', async () => {
    let fails = true
    stubGit({
      repoStatus: async () => {
        if (fails) {
          throw new Error('git status failed')
        }

        return cleanStatus
      }
    })
    renderWithQuery(<GitSection />)

    expect(await screen.findByText('Git is unavailable for this workspace')).toBeTruthy()
    expect(screen.queryByText('This workspace is not a Git repository')).toBeNull()
    fails = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('summary-main')).toBeTruthy()
  })

  it('does not let a previous profile response paint the active profile', async () => {
    let resolveOld!: (value: HermesReviewShipInfo) => void

    const old = new Promise<HermesReviewShipInfo>(resolve => {
      resolveOld = resolve
    })

    let calls = 0
    stubGit({ shipInfo: async () => (++calls === 1 ? old : { ghReady: false, pr: null }) })
    renderWithQuery(<GitSection />)

    act(() => $activeGatewayProfile.set('work'))
    expect(await screen.findByText('summary-main')).toBeTruthy()

    await act(async () => resolveOld({ ghReady: true, pr: { number: 7, state: 'OPEN', url: 'https://example.com/7' } }))
    expect(screen.queryByText(/#7/)).toBeNull()
  })

  it('does not continue an old changes request through the new profile bridge', async () => {
    let resolveOldStatus!: (value: HermesRepoStatus) => void

    const oldStatus = new Promise<HermesRepoStatus>(resolve => {
      resolveOldStatus = resolve
    })

    stubGit({ repoStatus: async () => oldStatus })
    renderWithQuery(<ChangesSection />)

    const next = stubGit({ list: async () => ({ base: null, files: [file('new-profile.ts')] }) })
    act(() => $activeGatewayProfile.set('work'))
    expect(await screen.findByText('new-profile.ts')).toBeTruthy()

    await act(async () => resolveOldStatus(cleanStatus))
    expect(next.review.list).toHaveBeenCalledOnce()
  })
})

describe('Summary revert confirmation', () => {
  it('keeps the destructive confirmation visible without mounting ReviewPane', async () => {
    const { review } = stubGit({ list: async () => ({ base: null, files: [file('danger.ts')] }) })
    renderWithQuery(
      <>
        <SummaryPane requestGateway={vi.fn()} />
        <ReviewRevertDialog />
      </>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Revert file: danger.ts' }))
    expect(screen.getByRole('dialog', { name: 'Revert' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Revert' }))
    await waitFor(() => expect(review.revert).toHaveBeenCalledWith('/summary-repo', 'danger.ts'))
  })
})
