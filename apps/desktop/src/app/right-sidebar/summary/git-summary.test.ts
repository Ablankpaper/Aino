import { describe, expect, it } from 'vitest'

import type { HermesRepoStatus } from '@/global'

import { summarizeReviewFiles, summaryGitState } from './git-summary'

const cleanStatus: HermesRepoStatus = {
  added: 0,
  ahead: 0,
  behind: 0,
  branch: 'main',
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

describe('summary Git helpers', () => {
  it('aggregates file and line counts without losing staged state', () => {
    expect(
      summarizeReviewFiles([
        { added: 3, path: 'a.ts', removed: 1, staged: true, status: 'M' },
        { added: 0, path: 'b.ts', removed: 2, staged: false, status: 'M' }
      ])
    ).toEqual({ added: 3, files: 2, removed: 3, staged: 1 })
  })

  it('reports Git unavailable separately from a clean repository', () => {
    expect(summaryGitState(null, { ghReady: false, pr: null })).toEqual({ kind: 'unavailable' })
    expect(summaryGitState(cleanStatus, { ghReady: false, pr: null }).kind).toBe('clean')
  })
})
