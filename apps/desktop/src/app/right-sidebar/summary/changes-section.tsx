import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { desktopGit } from '@/lib/desktop-git'
import { Code } from '@/lib/icons'
import { $activeConnectionId } from '@/store/connections'
import { notifyError } from '@/store/notifications'
import { $activeGatewayProfile } from '@/store/profile'
import { $projectTree, projectIdForCwd } from '@/store/projects'
import {
  requestRevert,
  revealReview,
  reviewFilesForCwd,
  selectReviewFile,
  stageReviewFile,
  unstageReviewFile
} from '@/store/review'
import { $currentCwd, $selectedStoredSessionId, $workspaceCwdOwner } from '@/store/session'
import { $workspaceChangeTick } from '@/store/workspace-events'

import { summarizeReviewFiles } from './git-summary'
import { SummarySection, SummaryValue } from './summary-section'

export function ChangesSection() {
  const { t } = useI18n()
  const cwd = useStore($currentCwd).trim()
  const selectedSessionId = useStore($selectedStoredSessionId)
  const cwdOwner = useStore($workspaceCwdOwner)
  const connection = useStore($activeConnectionId)
  const profile = useStore($activeGatewayProfile)
  const projects = useStore($projectTree)
  const workspaceTick = useStore($workspaceChangeTick)
  const [mutationBusy, setMutationBusy] = useState(false)
  const copy = t.summary.changes
  const projectId = projectIdForCwd(cwd, projects)
  const hasProject = projects.some(project => project.id === projectId && !project.isNoProject)
  const ownsWorkspace = Boolean(cwd && selectedSessionId && cwdOwner === selectedSessionId && hasProject)

  const changesQuery = useQuery({
    enabled: ownsWorkspace,
    queryKey: ['summary-changes', connection, profile, selectedSessionId, cwd, workspaceTick],
    queryFn: async () => {
      const git = desktopGit()

      if (!git?.repoStatus) {
        throw new Error('Git is unavailable')
      }

      const status = await git.repoStatus(cwd)

      return status ? { files: await reviewFilesForCwd(cwd, git.review), isRepo: true } : { files: [], isRepo: false }
    },
    retry: false
  })

  const runMutation = async (action: () => Promise<void>, label: string) => {
    setMutationBusy(true)

    try {
      await action()
    } catch (error) {
      notifyError(error, label)
    } finally {
      setMutationBusy(false)
    }
  }

  if (!ownsWorkspace) {
    return (
      <SummarySection emptyMessage={t.summary.environment.noProject} icon={Code} state="empty" title={copy.title} />
    )
  }

  if (changesQuery.isPending) {
    return <SummarySection icon={Code} state="loading" title={copy.title} />
  }

  if (changesQuery.error) {
    return (
      <SummarySection
        error={copy.unavailable}
        icon={Code}
        onRetry={() => void changesQuery.refetch()}
        state="error"
        title={copy.title}
      />
    )
  }

  if (!changesQuery.data.isRepo) {
    return (
      <SummarySection
        emptyMessage={t.summary.git.noRepository}
        icon={Code}
        onRetry={() => void changesQuery.refetch()}
        state="empty"
        title={copy.title}
      />
    )
  }

  const files = changesQuery.data.files

  if (files.length === 0) {
    return (
      <SummarySection
        emptyMessage={copy.noChanges}
        icon={Code}
        onRetry={() => void changesQuery.refetch()}
        state="empty"
        title={copy.title}
      />
    )
  }

  const totals = summarizeReviewFiles(files)
  const busy = mutationBusy || changesQuery.isFetching

  return (
    <SummarySection icon={Code} title={copy.title}>
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <SummaryValue label={copy.files(totals.files)} value={`${copy.additions} +${totals.added}`} />
          <SummaryValue label={copy.staged(totals.staged)} value={`${copy.deletions} -${totals.removed}`} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            className="min-w-0 justify-start px-1"
            disabled={busy}
            onClick={() => revealReview(cwd)}
            size="inline"
            type="button"
            variant="text"
          >
            <Codicon name="diff" size="0.8rem" />
            <span className="truncate">{copy.viewDiff}</span>
          </Button>
          <Tip label={copy.refresh}>
            <Button
              aria-label={copy.refresh}
              disabled={busy}
              onClick={() => void changesQuery.refetch()}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <Codicon name="refresh" size="0.8rem" spinning={changesQuery.isFetching} />
            </Button>
          </Tip>
        </div>
        <div className="grid gap-0.5">
          {files.map(file => (
            <div className="flex min-w-0 items-center gap-1" key={file.path}>
              <Button
                className="min-w-0 flex-1 justify-start truncate px-1 font-mono text-[0.66rem]"
                onClick={() => {
                  revealReview(cwd)
                  void selectReviewFile(file)
                }}
                size="inline"
                title={file.path}
                type="button"
                variant="text"
              >
                {file.path}
              </Button>
              <span className="shrink-0 tabular-nums text-[0.62rem] text-(--ui-text-tertiary)">
                +{file.added} -{file.removed}
              </span>
              <Tip label={file.staged ? copy.unstage : copy.stage}>
                <Button
                  aria-label={`${file.staged ? copy.unstage : copy.stage}: ${file.path}`}
                  disabled={busy}
                  onClick={() =>
                    void runMutation(
                      () => (file.staged ? unstageReviewFile(file.path, cwd) : stageReviewFile(file.path, cwd)),
                      file.staged ? copy.unstage : copy.stage
                    )
                  }
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <Codicon name={file.staged ? 'remove' : 'add'} size="0.75rem" />
                </Button>
              </Tip>
              <Tip label={copy.revert}>
                <Button
                  aria-label={`${copy.revert}: ${file.path}`}
                  disabled={busy}
                  onClick={() => requestRevert(file.path, cwd)}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <Codicon name="discard" size="0.75rem" />
                </Button>
              </Tip>
            </div>
          ))}
        </div>
      </div>
    </SummarySection>
  )
}
