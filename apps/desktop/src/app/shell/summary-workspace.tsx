import { useStore } from '@nanostores/react'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import type { ReactNode } from 'react'

import { WiredPane } from '@/app/contrib/context'
import { CARD_SURFACE_CLASS } from '@/components/ui/card-surface'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { $summaryOpen } from '@/store/summary'

import { SUMMARY_RAIL_WIDTH, useSummaryDock } from './use-summary-dock'

interface SummaryWorkspaceProps {
  children: ReactNode
}

interface SummaryRailProps {
  compact: boolean
  reducedMotion: boolean
}

function SummaryRail({ compact, reducedMotion }: SummaryRailProps) {
  const present = useIsPresent()
  const expanded = compact ? { height: 'auto', width: '100%' } : { height: '100%', width: SUMMARY_RAIL_WIDTH }
  const collapsed = compact ? { height: 0, width: '100%' } : { height: '100%', width: 0 }
  const offset = compact ? { x: 0, y: 16 } : { x: 16, y: 0 }
  const transition = { duration: reducedMotion ? 0 : 0.2, ease: 'easeOut' as const }

  return (
    <motion.div
      animate={expanded}
      aria-hidden={!present || undefined}
      className={cn('flex min-h-0 min-w-0 shrink-0 overflow-hidden', compact ? 'flex-col' : 'items-start')}
      data-slot="summary-rail"
      data-state={present ? 'open' : 'closed'}
      exit={collapsed}
      id="session-summary"
      inert={!present}
      initial={collapsed}
      style={{ maxHeight: compact ? '40%' : undefined }}
      transition={transition}
    >
      <motion.div
        animate={{ opacity: 1, x: 0, y: 0 }}
        className={cn(
          CARD_SURFACE_CLASS,
          'm-3 min-h-0 min-w-0 overflow-y-auto overscroll-contain',
          compact ? 'flex-auto' : 'max-h-[calc(100%_-_1.5rem)] w-80 shrink-0'
        )}
        data-slot="summary-card"
        exit={{ opacity: 0, ...offset }}
        initial={{ opacity: 0, ...offset }}
        transition={transition}
      >
        <WiredPane part="summary" />
      </motion.div>
    </motion.div>
  )
}

/** A presentation-only rail; the user's tiling tree and live panes stay intact. */
export function SummaryWorkspace({ children }: SummaryWorkspaceProps) {
  const open = useStore($summaryOpen)
  const { compact, layoutRef, workspaceRef } = useSummaryDock()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <div
      className={cn('relative flex min-h-0 min-w-0 flex-1', compact && 'flex-col')}
      data-slot="summary-workspace"
      ref={workspaceRef}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1" data-slot="summary-workspace-main" ref={layoutRef}>
        {children}
      </div>
      <AnimatePresence initial={false}>
        {open && <SummaryRail compact={compact} key="summary" reducedMotion={reducedMotion} />}
      </AnimatePresence>
    </div>
  )
}
