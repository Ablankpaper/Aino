import { useStore } from '@nanostores/react'

import type { GatewayRequester } from '@/app/contrib/types'
import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { useI18n } from '@/i18n'
import { Activity, BarChart3, Code, Cpu, GitBranch, Link, Users } from '@/lib/icons'
import { closeSummary } from '@/store/summary'
import { $selectedStoredSessionId } from '@/store/session'

import { SummarySection } from './summary-section'

interface SummaryPaneProps {
  requestGateway: GatewayRequester
}

/** Unified session/workspace summary mounted in the existing right rail. */
export function SummaryPane({ requestGateway }: SummaryPaneProps) {
  const { t } = useI18n()
  const selectedSessionId = useStore($selectedStoredSessionId)
  const copy = t.summary

  return (
    <aside
      aria-label={copy.aria}
      className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-(--ui-bg-chrome)"
      data-slot="summary-pane"
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-(--ui-stroke-secondary) px-3">
        <h1 className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-foreground">{copy.title}</h1>
        <Button aria-label={copy.close} onClick={closeSummary} size="icon-xs" type="button" variant="ghost">
          <Codicon name="close" size="0.875rem" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto" data-summary-session={selectedSessionId ?? 'none'}>
        <SummarySection icon={Activity} title={copy.environment.title}>
          <p>{selectedSessionId ? copy.environment.connection : copy.environment.noSession}</p>
        </SummarySection>
        <SummarySection icon={Code} title={copy.changes.title} />
        <SummarySection icon={GitBranch} title={copy.git.title} />
        <SummarySection icon={Users} title={copy.agents.title} />
        <SummarySection icon={BarChart3} title={copy.context.title}>
          <p data-summary-request-ready={typeof requestGateway === 'function' ? 'true' : 'false'}>{copy.context.noData}</p>
        </SummarySection>
        <SummarySection icon={Link} title={copy.sources.title} />
        <SummarySection icon={Cpu} title={copy.resources.title} />
      </div>
    </aside>
  )
}

export { SummarySection }
