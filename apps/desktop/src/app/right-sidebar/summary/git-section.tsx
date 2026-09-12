import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import type { HermesReviewShipInfo } from '@/global'
import { useI18n } from '@/i18n'
import { desktopGit } from '@/lib/desktop-git'
import { GitBranch } from '@/lib/icons'
import { $activeConnectionId } from '@/store/connections'
import { notifyError } from '@/store/notifications'
import { $activeGatewayProfile } from '@/store/profile'
import { $projectTree, projectIdForCwd } from '@/store/projects'
import { $reviewShipBusy, pushChanges } from '@/store/review'
import { $currentCwd, $selectedStoredSessionId, $workspaceCwdOwner } from '@/store/session'
import { $workspaceChangeTick } from '@/store/workspace-events'

import { summaryGitState } from './git-summary'
import { SummarySection, SummaryValue } from './summary-section'

const EMPTY_SHIP_INFO: HermesReviewShipInfo = { ghReady: false, pr: null }

export function GitSection() {
  const { t } = useI18n()
  const cwd = useStore($currentCwd).trim()
  const selectedSessionId = useStore($selectedStoredSessionId)
  const cwdOwner = useStore($workspaceCwdOwner)
  const shipBusy = useStore($reviewShipBusy)
  const connection = useStore($activeConnectionId)
  const profile = useStore($activeGatewayProfile)
  const projects = useStore($projectTree)
  const workspaceTick = useStore($workspaceChangeTick)
  const projectId = projectIdForCwd(cwd, projects)
  const hasProject = projects.some(project => project.id === projectId && !project.isNoProject)
  const ownsWorkspace = Boolean(cwd && selectedSessionId && cwdOwner === selectedSessionId && hasProject)

  const gitQuery = useQuery({
    enabled: ownsWorkspace,
    queryKey: ['summary-git', connection, profile, selectedSessionId, cwd, workspaceTick],
    queryFn: async () => {
      const git = desktopGit()

      if (!git?.repoStatus) {
        throw new Error('Git is unavailable')
      }

      const status = await git.repoStatus(cwd)

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
    return (
      <SummarySection
        emptyMessage={t.summary.environment.noProject}
        icon={GitBranch}
        state="empty"
        title={t.summary.git.title}
      />
    )
  }

  if (gitQuery.isPending) {
    return <SummarySection icon={GitBranch} state="loading" title={t.summary.git.title} />
  }

  if (gitQuery.error) {
    return (
      <SummarySection
        error={t.summary.git.unavailable}
        icon={GitBranch}
        onRetry={() => void gitQuery.refetch()}
        state="error"
        title={t.summary.git.title}
      />
    )
  }

  if (!gitQuery.data.status) {
    return (
      <SummarySection
        emptyMessage={t.summary.git.noRepository}
        icon={GitBranch}
        onRetry={() => void gitQuery.refetch()}
        state="empty"
        title={t.summary.git.title}
      />
    )
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
    try {
      await pushChanges(cwd)
      await gitQuery.refetch()
    } catch (error) {
      notifyError(error, t.summary.git.push)
    }
  }

  return (
    <SummarySection icon={GitBranch} title={t.summary.git.title}>
      <div className="grid gap-1">
        <SummaryValue label={t.summary.git.branch} value={state.branch || t.summary.state.noData} />
        <SummaryValue label={t.summary.git.tracking} value={tracking} />
        <SummaryValue
          label={t.summary.git.commit}
          value={gitQuery.data.head ? gitQuery.data.head.slice(0, 8) : t.summary.state.noData}
        />
        <SummaryValue
          label={t.summary.git.pullRequest}
          value={
            state.pullRequest ? `#${state.pullRequest.number} · ${state.pullRequest.state}` : t.summary.state.noData
          }
        />
        <Tip label={t.summary.git.push}>
          <Button
            aria-label={t.summary.git.push}
            className="mt-1 justify-start px-1"
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
