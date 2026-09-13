import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import type { HermesReviewShipInfo } from '@/global'
import { useI18n } from '@/i18n'
import { desktopGit } from '@/lib/desktop-git'
import { GitBranch } from '@/lib/icons'
import { notifyError } from '@/store/notifications'
import { $projectTree, projectIdForCwd } from '@/store/projects'
import { $reviewShipBusy, pushChanges, revealReview } from '@/store/review'
import { $workspaceChangeTick } from '@/store/workspace-events'

import { summaryGitState } from './git-summary'
import { SummarySection, SummaryValue } from './summary-section'
import { type SummarySession, summarySessionIsCurrent } from './use-summary-session'

const EMPTY_SHIP_INFO: HermesReviewShipInfo = { ghReady: false, pr: null }

export function GitSection({ embedded = false, session }: { embedded?: boolean; session: SummarySession }) {
  const { t } = useI18n()
  const cwd = session.cwd.trim()
  const selectedSessionId = session.storedId
  const shipBusy = useStore($reviewShipBusy)
  const { connectionId: connection, profile } = session.scope
  const projects = useStore($projectTree)
  const workspaceTick = useStore($workspaceChangeTick)
  const projectId = projectIdForCwd(cwd, projects)
  const hasProject = projects.some(project => project.id === projectId && !project.isNoProject)
  const ownsWorkspace = Boolean(cwd && selectedSessionId && hasProject)
  const current = summarySessionIsCurrent(session)

  const gitQuery = useQuery({
    enabled: ownsWorkspace && current,
    queryKey: ['summary-git', connection, profile, selectedSessionId, cwd, workspaceTick],
    queryFn: async () => {
      if (!summarySessionIsCurrent(session)) {
        throw new Error('Workspace changed')
      }

      const git = desktopGit()

      if (!git?.repoStatus) {
        throw new Error('Git is unavailable')
      }

      const status = await git.repoStatus(cwd)

      if (!summarySessionIsCurrent(session)) {
        throw new Error('Workspace changed')
      }

      if (!status) {
        return { head: null, ship: EMPTY_SHIP_INFO, status: null }
      }

      const review = git.review

      const [ship, head] = await Promise.all([
        review?.shipInfo ? review.shipInfo(cwd) : EMPTY_SHIP_INFO,
        review?.revParse ? review.revParse(cwd, 'HEAD') : null
      ])

      return { head, ship, status }
    },
    retry: false
  })

  if (!ownsWorkspace) {
    return null
  }

  if (!current) {
    return (
      <SummarySection
        embedded={embedded}
        emptyMessage={t.summary.git.unavailable}
        state="empty"
        title={t.summary.git.title}
      />
    )
  }

  if (gitQuery.isPending) {
    return <SummarySection embedded={embedded} icon={GitBranch} state="loading" title={t.summary.git.title} />
  }

  if (gitQuery.error) {
    return (
      <SummarySection
        embedded={embedded}
        error={t.summary.git.unavailable}
        icon={GitBranch}
        onRetry={() => void gitQuery.refetch()}
        state="error"
        title={t.summary.git.title}
      />
    )
  }

  if (!gitQuery.data.status) {
    return null
  }

  const state = summaryGitState(gitQuery.data.status, gitQuery.data.ship)

  if (state.kind === 'unavailable') {
    return null
  }

  const tracking =
    state.ahead || state.behind
      ? [state.ahead && t.summary.git.ahead(state.ahead), state.behind && t.summary.git.behind(state.behind)]
          .filter(Boolean)
          .join(', ')
      : t.summary.git.clean

  const push = async () => {
    if (!summarySessionIsCurrent(session)) {
      return
    }

    try {
      await pushChanges(cwd)
      await gitQuery.refetch()
    } catch (error) {
      notifyError(error, t.summary.git.push)
    }
  }

  return (
    <SummarySection embedded={embedded} title={t.summary.git.title}>
      <div className="grid gap-1">
        {embedded ? (
          <div className="flex min-w-0 items-center gap-2">
            <Codicon className="shrink-0 text-(--ui-text-tertiary)" name="git-branch" />
            <Tip label={`${t.summary.git.commit}: ${gitQuery.data.head || t.summary.state.noData}`}>
              <span className="min-w-0 flex-1 truncate">{state.branch || t.summary.state.noData}</span>
            </Tip>
            {(state.ahead > 0 || state.behind > 0) && (
              <span className="shrink-0 text-[length:var(--aino-text-caption)] text-(--ui-text-tertiary)">
                {tracking}
              </span>
            )}
          </div>
        ) : (
          <SummaryValue
            label={t.summary.git.branch}
            value={
              <Tip label={`${t.summary.git.commit}: ${gitQuery.data.head || t.summary.state.noData}`}>
                <span>{state.branch || t.summary.state.noData}</span>
              </Tip>
            }
          />
        )}
        {!embedded && <SummaryValue label={t.summary.git.tracking} value={tracking} />}
        {state.pullRequest && (
          <SummaryValue
            label={t.summary.git.pullRequest}
            value={
              state.pullRequest ? `#${state.pullRequest.number} · ${state.pullRequest.state}` : t.summary.state.noData
            }
          />
        )}
        <Button
          className="mt-1 justify-start"
          disabled={shipBusy || gitQuery.isFetching}
          onClick={() => {
            if (!summarySessionIsCurrent(session)) {
              return
            }

            revealReview(cwd, session.target)
          }}
          size="inline"
          type="button"
          variant="text"
        >
          <Codicon name="git-commit" />
          {t.summary.git.reviewAndCommit}
        </Button>
        <Tip label={t.summary.git.push}>
          <Button
            aria-label={t.summary.git.push}
            className="mt-1 justify-start"
            disabled={shipBusy || gitQuery.isFetching || state.ahead === 0}
            onClick={() => void push()}
            size="inline"
            type="button"
            variant="text"
          >
            <Codicon name="cloud-upload" size="0.8rem" />
            {t.summary.git.push}
          </Button>
        </Tip>
      </div>
    </SummarySection>
  )
}
