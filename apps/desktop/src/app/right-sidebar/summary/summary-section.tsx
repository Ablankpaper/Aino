import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n'
import type { IconComponent } from '@/lib/icons'
import { cn } from '@/lib/utils'

export interface SummarySectionProps {
  children?: ReactNode
  emptyMessage?: ReactNode
  error?: string
  icon: IconComponent
  onRetry?: () => void
  state?: 'empty' | 'error' | 'loading' | 'ready'
  title: string
}

/** Flat, independently stateful section primitive for the summary rail. */
export function SummarySection({
  children,
  emptyMessage,
  error,
  icon: Icon,
  onRetry,
  state = 'ready',
  title
}: SummarySectionProps) {
  const { t } = useI18n()
  const copy = t.summary

  return (
    <section
      className="border-b border-(--ui-stroke-secondary) px-3 py-3 last:border-b-0"
      data-slot="summary-section"
      data-state={state}
    >
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-(--ui-text-tertiary)" />
        <h2 className="min-w-0 flex-1 truncate text-[0.75rem] font-medium text-foreground">{title}</h2>
      </div>

      {state === 'loading' ? (
        <Loader className="py-2" label={copy.state.loading} />
      ) : state === 'error' ? (
        <div className="flex min-w-0 items-center gap-2 text-[0.6875rem] text-(--ui-text-tertiary)">
          <Codicon className="shrink-0 text-destructive" name="error" size="0.8rem" />
          <span className="min-w-0 flex-1 break-words">{error ?? copy.state.unavailable}</span>
          {onRetry && (
            <Button aria-label={copy.state.retry} onClick={onRetry} size="inline" type="button" variant="text">
              {copy.state.retry}
            </Button>
          )}
        </div>
      ) : state === 'empty' ? (
        <div className="flex min-w-0 items-center gap-2 text-[0.6875rem] text-(--ui-text-tertiary)">
          <p className="min-w-0 flex-1">{emptyMessage ?? copy.state.noData}</p>
          {onRetry && (
            <Button aria-label={copy.state.retry} onClick={onRetry} size="inline" type="button" variant="text">
              {copy.state.retry}
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'min-w-0 text-[0.6875rem] text-(--ui-text-secondary)',
            !children && 'text-(--ui-text-tertiary)'
          )}
        >
          {children ?? copy.state.noData}
        </div>
      )}
    </section>
  )
}

export function SummaryValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 py-0.5">
      <span className="shrink-0 text-(--ui-text-tertiary)">{label}</span>
      <span
        className="min-w-0 truncate text-right text-foreground"
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </span>
    </div>
  )
}
