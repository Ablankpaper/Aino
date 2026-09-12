import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { desktopGit } from '@/lib/desktop-git'
import { GitBranch } from '@/lib/icons'
import { $repoStatus, $repoStatusLoading, refreshRepoStatus } from '@/store/coding-status'
import { $activeConnectionId } from '@/store/connections'
import { notifyError } from '@/store/notifications'
import { $activeGatewayProfile } from '@/store/profile'
import {
  $reviewShipBusy,
  $reviewShipInfo,
  pushChanges,
  refreshShipInfo
} from '@/store/review'
import {
  $currentCwd,
  $selectedStoredSessionId,
  $workspaceCwdOwner
} from '@/store/session'

import { summaryGitState } from './git-summary'
import { SummarySection, SummaryValue } from './summary-section'

export function GitSection() {
  const { t } = useI18n()
  const cwd = useStore($currentCwd).trim()
  const selectedSessionId = useStore($selectedStoredSessionId)
  const cwdOwner = useStore($workspaceCwdOwner)
  const status = useStore($repoStatus)
  const statusLoading = useStore($repoStatusLoading)
  const ship = useStore($reviewShipInfo)
  const shipBusy = useStore($reviewShipBusy)
  const connection = useStore($activeConnectionId)
  const profile = useStore($activeGatewayProfile)
  const ownsWorkspace = Boolean(cwd && selectedSessionId && cwdOwner === selectedSessionId)
  const gitBridge = desktopGit()?.repoStatus

  useEffect(() => {
    if (!ownsWorkspace) {
      return
    }

    void refreshRepoStatus(cwd)
    void refreshShipInfo()
  }, [cwd, ownsWorkspace])

  const headQuery = useQuery({
    enabled: ownsWorkspace && Boolean(gitBridge),
    queryKey: ['summary-head', connection, profile, cwd],
    queryFn: async () => {
      const revParse = desktopGit()?.review?.revParse

      if (!revParse) {
        return null
      }

      return revParse(cwd, 'HEAD')
    },
    retry: false
  })

  if (!ownsWorkspace) {
    return <SummarySection emptyMessage={t.summary.environment.noProject} icon={GitBranch} state="empty" title={t.summary.git.title} />
  }

  if (statusLoading && !status) {
    return <SummarySection icon={GitBranch} state="loading" title={t.summary.git.title} />
  }

  if (!gitBridge) {
    return (
      <SummarySection
        error={t.summary.git.unavailable}
        icon={GitBranch}
        onRetry={() => void refreshRepoStatus(cwd)}
        state="error"
        title={t.summary.git.title}
      />
    )
  }

  const state = summaryGitState(status, ship)

  if (state.kind === 'unavailable') {
    return <SummarySection emptyMessage={t.summary.git.noRepository} icon={GitBranch} state="empty" title={t.summary.git.title} />
  }

  const tracking = state.ahead || state.behind ? [state.ahead && t.summary.git.ahead(state.ahead), state.behind && t.summary.git.behind(state.behind)].filter(Boolean).join(', ') : t.summary.git.clean

  return (
    <SummarySection icon={GitBranch} title={t.summary.git.title}>
      <div className="grid gap-1">
        <SummaryValue label={t.summary.git.branch} value={state.branch || t.summary.state.noData} />
        <SummaryValue label={t.summary.git.tracking} value={tracking} />
        <SummaryValue label={t.summary.git.commit} value={headQuery.data ? headQuery.data.slice(0, 8) : t.summary.state.noData} />
        <SummaryValue label={t.summary.git.pullRequest} value={state.pullRequest ? `#${state.pullRequest.number} · ${state.pullRequest.state}` : t.summary.state.noData} />
        <Tip label={t.summary.git.push}>
          <Button
            aria-label={t.summary.git.push}
            className="mt-1 justify-start px-1"
            disabled={shipBusy || state.ahead === 0}
            onClick={() => void pushChanges().catch(error => notifyError(error, t.summary.git.push))}
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
