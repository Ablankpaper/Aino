import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { WiredPane } from '@/app/contrib/context'
import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { triggerHaptic } from '@/lib/haptics'
import { List } from '@/lib/icons'
import { $summaryOpen, closeSummary } from '@/store/summary'

import { TITLEBAR_CONTROL_SIZE, TITLEBAR_TOOL_GAP } from './titlebar'

/** An ephemeral summary: opening it never changes the workspace layout. */
export function SummaryPopover() {
  const { t } = useI18n()
  const open = useStore($summaryOpen)

  useEffect(() => closeSummary, [])

  return (
    <Popover onOpenChange={next => $summaryOpen.set(next)} open={open}>
      <Tip label={t.summary.title}>
        <PopoverTrigger asChild>
          <Button
            aria-label={t.summary.title}
            aria-pressed={open}
            onClick={() => triggerHaptic('tap')}
            onPointerDown={event => event.stopPropagation()}
            size="icon-titlebar"
            type="button"
            variant="titlebar-popover"
          >
            <List />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent
        align="end"
        // Terminal and right-sidebar buttons follow the trigger; align the card
        // with the toolbar's outside edge without borrowing any pane width.
        alignOffset={-2 * (TITLEBAR_CONTROL_SIZE + TITLEBAR_TOOL_GAP)}
        aria-label={t.summary.title}
        className="max-h-[min(44rem,var(--radix-popover-content-available-height))] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain"
        collisionPadding={12}
        data-slot="summary-card"
        showArrow={false}
        sideOffset={16}
        variant="card"
      >
        <Button
          aria-label={t.summary.close}
          className="absolute top-3 right-3"
          onClick={closeSummary}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Codicon name="close" size="0.875rem" />
        </Button>
        <WiredPane part="summary" />
      </PopoverContent>
    </Popover>
  )
}
