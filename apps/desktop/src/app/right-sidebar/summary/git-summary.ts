import type { HermesRepoStatus, HermesReviewFile, HermesReviewShipInfo } from '@/global'

export interface ReviewSummary {
  added: number
  files: number
  removed: number
  staged: number
}

export function summarizeReviewFiles(files: readonly HermesReviewFile[]): ReviewSummary {
  return files.reduce<ReviewSummary>(
    (summary, file) => ({
      added: summary.added + file.added,
      files: summary.files + 1,
      removed: summary.removed + file.removed,
      staged: summary.staged + (file.staged ? 1 : 0)
    }),
    { added: 0, files: 0, removed: 0, staged: 0 }
  )
}

export type SummaryGitState =
  | { kind: 'clean'; ahead: number; behind: number; branch: string; pullRequest: HermesReviewShipInfo['pr'] }
  | { kind: 'dirty'; ahead: number; behind: number; branch: string; pullRequest: HermesReviewShipInfo['pr'] }
  | { kind: 'unavailable' }

export function summaryGitState(status: HermesRepoStatus | null, ship: HermesReviewShipInfo): SummaryGitState {
  if (!status) {
    return { kind: 'unavailable' }
  }

  return {
    ahead: status.ahead,
    behind: status.behind,
    branch: status.branch ?? '',
    kind: status.changed > 0 ? 'dirty' : 'clean',
    pullRequest: ship.pr
  }
}
