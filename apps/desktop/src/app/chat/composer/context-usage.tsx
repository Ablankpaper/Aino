import { useStore } from '@nanostores/react'
import { useEffect, useMemo, useState } from 'react'

import { summaryContextUsage } from '@/app/right-sidebar/summary/summary-data'
import { ContextUsagePanel } from '@/app/shell/context-usage-panel'
import { useContextBreakdown } from '@/app/shell/hooks/use-context-breakdown'
import { usePaneVisible } from '@/components/pane-shell/pane-visibility'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { useStoreSelector } from '@/lib/use-session-slice'
import { sessionCompacting } from '@/store/compaction'
import { $sessionStates } from '@/store/session-states'
import type { UsageStats } from '@/types/hermes'

import { useSessionView } from '../session-view'

interface ComposerContextUsageProps {
  enabled: boolean
  requestGateway: <T>(method: string, params?: Record<string, unknown>) => Promise<T>
}

const EMPTY_USAGE: UsageStats = { calls: 0, input: 0, output: 0, total: 0 }

/** The model row's own session, using its existing owner-routed gateway request. */
export function ComposerContextUsage({ enabled, requestGateway }: ComposerContextUsageProps) {
  const view = useSessionView()
  const sessionId = useStore(view.$runtimeId)
  const busy = useStore(view.$busy)
  const visible = usePaneVisible()
  const compacting = useStore(useMemo(() => sessionCompacting(sessionId), [sessionId]))
  const usage = useStoreSelector($sessionStates, states => (sessionId ? states[sessionId]?.usage : null) ?? EMPTY_USAGE)
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const copy = t.shell.statusbar.contextUsagePanel

  const { breakdown, loading, refetch } = useContextBreakdown({
    busy: busy || compacting,
    enabled: enabled && visible,
    requestGateway,
    sessionId
  })

  const resolvedUsage = summaryContextUsage(usage, breakdown)

  const percent =
    resolvedUsage.context_percent == null ? null : Math.max(0, Math.min(100, Math.round(resolvedUsage.context_percent)))

  useEffect(() => setOpen(false), [sessionId, visible])

  if (!sessionId) {
    return null
  }

  const status = compacting
    ? copy.compacting
    : percent !== null
      ? `${resolvedUsage.context_estimated ? '~' : ''}${copy.percentFull(percent)}`
      : loading
        ? copy.loading
        : copy.empty

  const label = `${copy.title} · ${status}`
  const panelProps = { breakdown, compacting, loading, usage: resolvedUsage }

  const retryUnavailable = () => {
    if (!breakdown && !loading && enabled && visible && !busy && !compacting) {
      refetch()
    }
  }

  return (
    <Popover
      onOpenChange={nextOpen => {
        setOpen(nextOpen)

        if (nextOpen) {
          retryUnavailable()
        }
      }}
      open={open}
    >
      <Tip label={<ContextUsagePanel {...panelProps} compact />} side="top" variant="card">
        <PopoverTrigger asChild>
          <Button
            aria-label={label}
            data-slot="composer-context-usage"
            onFocus={retryUnavailable}
            onPointerEnter={retryUnavailable}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Progress
              animated={compacting || loading}
              aria-label={copy.title}
              destructive={percent !== null && percent >= 95}
              indeterminate={compacting || percent === null}
              shape="ring"
              value={(percent ?? 0) / 100}
            />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent
        align="end"
        aria-label={copy.title}
        className="max-h-[min(28rem,var(--radix-popover-content-available-height))] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain"
        data-slot="composer-context-details"
        showArrow={false}
        side="top"
        sideOffset={8}
        variant="card"
      >
        <ContextUsagePanel {...panelProps} />
      </PopoverContent>
    </Popover>
  )
}
