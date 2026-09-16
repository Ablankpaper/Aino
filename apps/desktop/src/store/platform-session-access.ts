import { platformModelCatalog } from './platform-models'
import { $sessionStates } from './session-states'

/** A foreign platform session remains locally readable, but its identity is immutable. */
export function platformHistoryOwner(sessionId?: string | null): string | null {
  const model = sessionId ? $sessionStates.get()[sessionId]?.platformModel : undefined
  const account = platformModelCatalog().account.get()

  return model && model.ownerUserId !== account?.account?.id ? model.ownerUserId : null
}
