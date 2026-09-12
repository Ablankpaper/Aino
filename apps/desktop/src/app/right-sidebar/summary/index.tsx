import { useStore } from '@nanostores/react'

import type { GatewayRequester } from '@/app/contrib/types'
import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { useI18n } from '@/i18n'
import { $selectedStoredSessionId } from '@/store/session'
import { closeSummary } from '@/store/summary'

import { AgentsSection } from './agents-section'
import { ChangesSection } from './changes-section'
import { ContextSection } from './context-section'
import { EnvironmentSection } from './environment-section'
import { GitSection } from './git-section'
import { ResourcesSection } from './resources-section'
import { SourcesSection } from './sources-section'

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
        <EnvironmentSection />
        <ChangesSection />
        <GitSection />
        <AgentsSection />
        <ContextSection requestGateway={requestGateway} />
        <SourcesSection />
        <ResourcesSection />
      </div>
    </aside>
  )
}
