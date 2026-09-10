import { createContext, type ReactNode } from 'react'

import { Contribute } from '@/contrib/react/contribute'

// Only the main chat shell owns a window titlebar; auxiliary windows keep
// their pane headers in place.
export const WindowTitlebarContext = createContext(false)

interface SessionHeaderPlacementProps {
  children: ReactNode
  enabled: boolean
  groupId: string
}

export function SessionHeaderPlacement({ children, enabled, groupId }: SessionHeaderPlacementProps) {
  if (!enabled) {
    return children
  }

  return (
    <Contribute area="titleBar.left" id={`session-header:${groupId}`} order={-100}>
      <div className="flex h-full min-w-0 max-w-full items-center" data-window-session-title={groupId}>
        {children}
      </div>
    </Contribute>
  )
}
