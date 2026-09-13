import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { useSessionSlice } from '@/lib/use-session-slice'
import { $subagentsBySession } from '@/store/subagents'
import { openSessionInNewWindow } from '@/store/windows'

import { summaryAgentCounts, type SummaryDelegation, summaryDelegations } from './session-activity'
import { SummarySection } from './summary-section'
import type { SummarySession } from './use-summary-session'

export function AgentsSection({ history, session }: { history: SummaryDelegation[]; session: SummarySession }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const live = useSessionSlice($subagentsBySession, session.runtimeId)
  const groups = useMemo(() => summaryDelegations(history, live), [history, live])
  const counts = summaryAgentCounts(groups)
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  if (!total) {
    return null
  }

  const labels = [
    counts.running && t.summary.agents.running(counts.running),
    counts.completed && t.summary.agents.completed(counts.completed),
    counts.failed && t.summary.agents.failed(counts.failed),
    counts.dispatched && t.summary.agents.dispatched(counts.dispatched)
  ].filter(Boolean)

  return (
    <SummarySection title={t.summary.agents.title}>
      <Button
        aria-expanded={expanded}
        className="w-full justify-start"
        onClick={() => setExpanded(value => !value)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Codicon name="organization" />
        <span className="min-w-0 flex-1 whitespace-normal text-left">{labels.join(' · ')}</span>
        <Codicon name={expanded ? 'chevron-down' : 'chevron-right'} />
      </Button>
      {expanded && (
        <div className="mt-2 grid gap-2">
          {groups.flatMap(group =>
            group.rows.map(row => {
              const finished = Boolean(group.completion)

              const status = finished
                ? group.completion!.failed
                  ? t.summary.agents.finished
                  : t.summary.agents.completed(1)
                : t.summary.agents.status[row.status]

              const open = row.sessionId
                ? () => void openSessionInNewWindow(row.sessionId!, { watch: true })
                : undefined

              return (
                <div className="grid min-w-0 gap-0.5" key={group.id + ':' + row.id}>
                  <div className="flex min-w-0 items-center gap-2">
                    {open ? (
                      <Tip label={row.goal}>
                        <Button
                          className="min-w-0 flex-1 justify-start"
                          onClick={open}
                          size="inline"
                          type="button"
                          variant="text"
                        >
                          <span className="truncate">{row.goal}</span>
                        </Button>
                      </Tip>
                    ) : (
                      <span className="min-w-0 flex-1 break-words">{row.goal}</span>
                    )}
                    <span className="shrink-0 text-[length:var(--aino-text-caption)] text-(--ui-text-tertiary)">
                      {status}
                    </span>
                  </div>
                  {row.activity.at(-1) && (
                    <p className="line-clamp-2 break-words text-[length:var(--aino-text-caption)] text-(--ui-text-tertiary)">
                      {row.activity.at(-1)}
                    </p>
                  )}
                </div>
              )
            })
          )}
          <Button
            className="mt-1 justify-start"
            onClick={() => void navigate('/agents')}
            size="inline"
            type="button"
            variant="text"
          >
            {t.summary.agents.viewAll}
          </Button>
        </div>
      )}
    </SummarySection>
  )
}
