import { useStore } from '@nanostores/react'

import { TerminalSlot } from './persistent'
import { TerminalRail } from './rail'
import { $terminals } from './terminals'

/** The tab strip stays in the pane DOM above the body slot chased by the
 *  persistent terminal overlay. Even a single terminal keeps its tab controls. */
export function TerminalPaneChrome() {
  const terminals = useStore($terminals)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {terminals.length > 0 && <TerminalRail />}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <TerminalSlot />
      </div>
    </div>
  )
}
