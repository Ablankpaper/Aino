import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { Code } from '@/lib/icons'
import { notifyError } from '@/store/notifications'
import {
  $reviewFiles,
  $reviewIsRepo,
  $reviewLoading,
  $reviewScopeCwd,
  $reviewShipBusy,
  refreshReview,
  requestRevert,
  revealReview,
  selectReviewFile,
  stageReviewFile,
  unstageReviewFile
} from '@/store/review'
import { $currentCwd, $selectedStoredSessionId, $workspaceCwdOwner } from '@/store/session'

import { summarizeReviewFiles } from './git-summary'
import { SummarySection, SummaryValue } from './summary-section'

export function ChangesSection() {
  const { t } = useI18n()
  const cwd = useStore($currentCwd).trim()
  const selectedSessionId = useStore($selectedStoredSessionId)
  const cwdOwner = useStore($workspaceCwdOwner)
  const files = useStore($reviewFiles)
  const loading = useStore($reviewLoading)
  const isRepo = useStore($reviewIsRepo)
  const reviewScopeCwd = useStore($reviewScopeCwd)
  const busy = useStore($reviewShipBusy)
  const copy = t.summary.changes
  const ownsWorkspace = Boolean(cwd && selectedSessionId && cwdOwner === selectedSessionId)

  useEffect(() => {
    if (!ownsWorkspace || (reviewScopeCwd && reviewScopeCwd !== cwd)) {
      return
    }

    void refreshReview({ allowClosed: true })
  }, [cwd, ownsWorkspace, reviewScopeCwd])

  if (!ownsWorkspace) {
    return <SummarySection emptyMessage={t.summary.environment.noProject} icon={Code} state="empty" title={copy.title} />
  }

  if (loading && files.length === 0) {
    return <SummarySection icon={Code} state="loading" title={copy.title} />
  }

  if (!isRepo) {
    return <SummarySection emptyMessage={t.summary.git.noRepository} icon={Code} state="empty" title={copy.title} />
  }

  if (files.length === 0) {
    return <SummarySection emptyMessage={copy.noChanges} icon={Code} state="empty" title={copy.title} />
  }

  const totals = summarizeReviewFiles(files)

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
            <Button aria-label={copy.refresh} disabled={loading} onClick={() => void refreshReview({ allowClosed: true })} size="icon-xs" type="button" variant="ghost">
              <Codicon name="refresh" size="0.8rem" spinning={loading} />
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
                    void (file.staged ? unstageReviewFile(file.path) : stageReviewFile(file.path)).catch(error =>
                      notifyError(error, file.staged ? copy.unstage : copy.stage)
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
                  onClick={() => requestRevert(file.path)}
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
