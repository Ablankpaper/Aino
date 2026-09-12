import { useStore } from '@nanostores/react'

import { useI18n } from '@/i18n'
import type { Translations } from '@/i18n/types'
import { Activity } from '@/lib/icons'
import { $activeGatewayProfile } from '@/store/profile'
import { $projectTree, projectIdForCwd } from '@/store/projects'
import {
  $currentBranch,
  $currentCwd,
  $currentModel,
  $currentProvider,
  $gatewayState,
  $selectedStoredSessionId,
  $workspaceCwdOwner
} from '@/store/session'

import { formatSummaryPath, summaryEnvironmentState } from './summary-data'
import { SummarySection, SummaryValue } from './summary-section'

function connectionLabel(state: string, copy: Translations['shell']['statusbar']): string {
  if (state === 'open') {
    return copy.gatewayReady
  }

  if (state === 'connecting') {
    return copy.gatewayConnecting
  }

  if (state === 'checking') {
    return copy.gatewayChecking
  }

  if (state === 'reconnecting' || state === 'restarting') {
    return copy.gatewayRestarting
  }

  if (state === 'idle') {
    return copy.gatewayOffline
  }

  return copy.gatewayUnavailable
}

export function EnvironmentSection() {
  const { t } = useI18n()
  const cwd = useStore($currentCwd)
  const cwdOwner = useStore($workspaceCwdOwner)
  const selectedSession = useStore($selectedStoredSessionId)
  const model = useStore($currentModel).trim()
  const provider = useStore($currentProvider).trim()
  const branch = useStore($currentBranch).trim()
  const gatewayState = useStore($gatewayState)
  const profile = useStore($activeGatewayProfile)
  const projects = useStore($projectTree)
  const projectId = projectIdForCwd(cwd, projects)
  const projectName = projects.find(project => project.id === projectId && !project.isNoProject)?.label ?? null
  const state = summaryEnvironmentState({ cwd, cwdOwner, projectName, selectedSession })
  const copy = t.summary.environment

  if (state.kind === 'no-session') {
    return <SummarySection emptyMessage={copy.noSession} icon={Activity} state="empty" title={copy.title} />
  }

  return (
    <SummarySection icon={Activity} title={copy.title}>
      <div className="grid gap-0.5">
        <SummaryValue label={copy.project} value={state.kind === 'ready' ? state.projectName : copy.noProject} />
        {state.kind === 'ready' && <SummaryValue label={copy.workingDirectory} value={formatSummaryPath(state.cwd)} />}
        <SummaryValue label={copy.model} value={model || t.shell.statusbar.noModel} />
        <SummaryValue label={copy.provider} value={provider || t.shell.statusbar.modelNone} />
        <SummaryValue label={copy.profile} value={profile || 'default'} />
        {state.kind === 'ready' && <SummaryValue label={copy.branch} value={branch || t.summary.state.noData} />}
        <SummaryValue label={copy.connection} value={connectionLabel(gatewayState, t.shell.statusbar)} />
      </div>
    </SummarySection>
  )
}
