import { useStore } from '@nanostores/react'

import type { GatewayRequester } from '@/app/contrib/types'
import { useI18n } from '@/i18n'
import { $selectedStoredSessionId } from '@/store/session'

import { AgentsSection } from './agents-section'
import { ChangesSection } from './changes-section'
import { ContextSection } from './context-section'
import { EnvironmentSection } from './environment-section'
import { GitSection } from './git-section'
import { SourcesSection } from './sources-section'

interface SummaryPaneProps {
  requestGateway: GatewayRequester
}

/** Live summary sections; the titlebar owns the floating card and dismissal. */
export function SummaryPane({ requestGateway }: SummaryPaneProps) {
  const { t } = useI18n()
  const selectedSessionId = useStore($selectedStoredSessionId)
  const copy = t.summary

  return (
    <aside aria-label={copy.aria} className="min-w-0 p-4" data-slot="summary-pane">
      <h1 className="sr-only">{copy.title}</h1>

      <div data-summary-session={selectedSessionId ?? 'none'}>
        <EnvironmentSection />
        <ChangesSection />
        <GitSection />
        <AgentsSection />
        <ContextSection requestGateway={requestGateway} />
        <SourcesSection />
      </div>
    </aside>
  )
}
