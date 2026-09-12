import { useStore } from '@nanostores/react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { Users } from '@/lib/icons'
import { $selectedStoredSessionId } from '@/store/session'
import { $subagentsBySession, activeSubagentCount, failedSubagentCount } from '@/store/subagents'

import { SummarySection } from './summary-section'

export function AgentsSection() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const selectedSessionId = useStore($selectedStoredSessionId)
  const bySession = useStore($subagentsBySession)
  const items = selectedSessionId ? bySession[selectedSessionId] ?? [] : []
  const running = activeSubagentCount(items)
  const failed = failedSubagentCount(items)
  const completed = items.filter(item => item.status === 'completed').length

  if (!selectedSessionId || items.length === 0) {
    return <SummarySection emptyMessage={t.summary.agents.none} icon={Users} state="empty" title={t.summary.agents.title} />
  }

  return (
    <SummarySection icon={Users} title={t.summary.agents.title}>
      <div className="grid gap-1">
        <p className="text-(--ui-text-secondary)">
          {t.summary.agents.running(running)} · {t.summary.agents.completed(completed)} ·{' '}
          {t.summary.agents.failed(failed)}
        </p>
        <Button
          className="mt-1 justify-start px-1"
          onClick={() => navigate('/agents')}
          size="inline"
          type="button"
          variant="text"
        >
          {t.summary.agents.viewAll}
        </Button>
      </div>
    </SummarySection>
  )
}
