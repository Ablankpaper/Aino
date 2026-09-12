import { useStore } from '@nanostores/react'

import type { GatewayRequester } from '@/app/contrib/types'
import { ContextUsagePanel } from '@/app/shell/context-usage-panel'
import { useContextBreakdown } from '@/app/shell/hooks/use-context-breakdown'
import { useI18n } from '@/i18n'
import { BarChart3 } from '@/lib/icons'
import { $activeSessionId, $busy, $currentUsage } from '@/store/session'

import { summaryContextUsage } from './summary-data'
import { SummarySection } from './summary-section'

export function ContextSection({ requestGateway }: { requestGateway: GatewayRequester }) {
  const { t } = useI18n()
  const activeSessionId = useStore($activeSessionId)
  const busy = useStore($busy)
  const usage = useStore($currentUsage)

  const { breakdown, loading } = useContextBreakdown({
    busy,
    enabled: true,
    requestGateway,
    sessionId: activeSessionId
  })

  const hasUsage =
    breakdown !== null || usage.context_max != null || usage.context_used != null || usage.context_percent != null

  if (loading && !hasUsage) {
    return <SummarySection icon={BarChart3} state="loading" title={t.summary.context.title} />
  }

  if (!hasUsage) {
    return (
      <SummarySection
        emptyMessage={t.summary.context.noData}
        icon={BarChart3}
        state="empty"
        title={t.summary.context.title}
      />
    )
  }

  const resolvedUsage = summaryContextUsage(usage, breakdown)

  return (
    <SummarySection icon={BarChart3} title={t.summary.context.title}>
      <div className="min-w-0 overflow-hidden [&_[data-slot='context-usage-panel']]:w-full [&_[data-slot='context-usage-panel']]:p-0">
        <ContextUsagePanel breakdown={breakdown} loading={loading} showTitle={false} usage={resolvedUsage} />
      </div>
    </SummarySection>
  )
}
