import { createContext, type ReactNode } from 'react'

import { Contribute } from '@/contrib/react/contribute'
import { useStoresSelector } from '@/lib/use-session-slice'
import { $activeSessionId, $selectedStoredSessionId } from '@/store/session'
import { $sessionStates, $sessionTiles } from '@/store/session-states'

// Only the main chat shell owns a window titlebar; auxiliary windows keep
// their pane headers in place.
export const WindowTitlebarContext = createContext(false)

interface SessionHeaderPlacementProps {
  children: ReactNode
  enabled: boolean
  groupId: string
  paneId: string
}

export function SessionHeaderPlacement({ children, enabled, groupId, paneId }: SessionHeaderPlacementProps) {
  if (!enabled) {
    return children
  }

  return (
    <WindowSessionHeader groupId={groupId} paneId={paneId}>
      {children}
    </WindowSessionHeader>
  )
}

function WindowSessionHeader({ children, groupId, paneId }: Omit<SessionHeaderPlacementProps, 'enabled'>) {
  const showHeader = useStoresSelector(
    [$activeSessionId, $selectedStoredSessionId, $sessionTiles, $sessionStates],
    () => {
      const primary = paneId === 'workspace'

      const runtimeId = primary
        ? $activeSessionId.get()
        : $sessionTiles.get().find(tile => `session-tile:${tile.storedSessionId}` === paneId)?.runtimeId

      if (primary && !$selectedStoredSessionId.get() && !runtimeId) {
        return false
      }

      // Only explicit local drafts are hidden: historical sessions can have an
      // empty transcript while resuming. Subscribe to this boolean, not tokens.
      return !runtimeId || !$sessionStates.get()[runtimeId]?.isUnsentDraft
    }
  )

  if (!showHeader) {
    return null
  }

  return (
    <Contribute area="titleBar.left" id={`session-header:${groupId}`} order={-100}>
      <div className="flex h-full min-w-0 max-w-full items-center" data-window-session-title={groupId}>
        {children}
      </div>
    </Contribute>
  )
}
