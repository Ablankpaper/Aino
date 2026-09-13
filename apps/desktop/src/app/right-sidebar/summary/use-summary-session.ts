import { useStore } from '@nanostores/react'

import { $toolSession, toolSessionIsCurrent } from '@/store/tool-session'

export function useSummarySession() {
  return useStore($toolSession)
}

export type SummarySession = ReturnType<typeof useSummarySession>

export const summarySessionIsCurrent = toolSessionIsCurrent
