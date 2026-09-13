import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { layoutRequiredWidth } from '@/components/pane-shell/tree/renderer/required-width'
import { useResizeObserver } from '@/hooks/use-resize-observer'

export const SUMMARY_RAIL_WIDTH = 344

/** Measure chrome tracks only; streaming transcript mutations do not affect docking. */
export function useSummaryDock() {
  const workspaceRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  const measure = useCallback(() => {
    const workspace = workspaceRef.current
    const layout = layoutRef.current

    if (!workspace || !layout) {
      return
    }

    const width = workspace.getBoundingClientRect().width
    setCompact(width < Math.max(1024, layoutRequiredWidth(layout) + SUMMARY_RAIL_WIDTH))
  }, [])

  useResizeObserver(measure, workspaceRef)

  useLayoutEffect(() => {
    const layout = layoutRef.current

    if (!layout) {
      return
    }

    let frame = 0

    const observer = new MutationObserver(records => {
      if (records.every(record => (record.target as Element).closest('[data-tree-group]'))) {
        return
      }

      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })

    observer.observe(layout, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true })

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [measure])

  return { compact, layoutRef, workspaceRef }
}
