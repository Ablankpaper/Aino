import { computed } from 'nanostores'

import { $activeNarrowPane } from '@/components/pane-shell/tree/narrow-overlay-state'
import {
  $collapsedTreeSides,
  $layoutTree,
  $narrowViewport,
  $paneVisible,
  paneRootSide
} from '@/components/pane-shell/tree/store'

export const $summaryVisible = computed(
  [$paneVisible('summary'), $collapsedTreeSides, $layoutTree, $narrowViewport, $activeNarrowPane],
  (paneVisible, collapsedSides, _tree, narrow, overlayPane) => {
    if (narrow) {
      return overlayPane === 'summary'
    }

    const side = paneRootSide('summary')

    return paneVisible && (!side || !collapsedSides.has(side))
  }
)
