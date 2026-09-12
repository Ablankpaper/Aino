import { useStore } from '@nanostores/react'

import { Button } from '@/components/ui/button'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { ExternalLink, Link } from '@/lib/icons'
import { normalizeOrLocalPreviewTarget } from '@/lib/local-preview'
import { cn } from '@/lib/utils'
import { notifyError } from '@/store/notifications'
import { openPreview } from '@/store/preview'
import { $previewStatusBySession } from '@/store/preview-status'
import { $selectedStoredSessionId } from '@/store/session'
import { closeSummary } from '@/store/summary'

import { formatSummaryPath, sourceItems } from './summary-data'
import { SummarySection } from './summary-section'

export function SourcesSection() {
  const { t } = useI18n()
  const selectedSessionId = useStore($selectedStoredSessionId)
  const previewsBySession = useStore($previewStatusBySession)
  const records = selectedSessionId ? (previewsBySession[selectedSessionId] ?? []) : []
  const items = sourceItems(records)

  const openSource = async (target: string, cwd: string) => {
    try {
      const preview = await normalizeOrLocalPreviewTarget(target, cwd || undefined)

      if (preview) {
        openPreview(preview, 'manual')
        closeSummary()
      }
    } catch (error) {
      notifyError(error, t.summary.state.unavailable)
    }
  }

  return (
    <SummarySection
      emptyMessage={t.summary.sources.none}
      icon={Link}
      state={items.length ? 'ready' : 'empty'}
      title={t.summary.sources.title}
    >
      <div className="grid gap-1">
        {items.map(item => (
          <Tip key={item.id} label={item.target}>
            <Button
              aria-label={`${t.summary.sources.open}: ${item.label}`}
              className="min-w-0 justify-start gap-1.5 px-1 text-left"
              onClick={() => void openSource(item.target, item.cwd)}
              size="inline"
              type="button"
              variant="text"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className={cn('min-w-0 truncate', item.target !== item.label && 'text-(--ui-text-secondary)')}>
                {item.label || formatSummaryPath(item.target)}
              </span>
            </Button>
          </Tip>
        ))}
      </div>
    </SummarySection>
  )
}
