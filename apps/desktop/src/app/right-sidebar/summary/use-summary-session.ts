import { useStore } from '@nanostores/react'
import { useMemo } from 'react'

import { useStoreSelector } from '@/lib/use-session-slice'
import { $activeConnectionId } from '@/store/connections'
import { $activeGatewayProfile } from '@/store/profile'
import {
  $activeSessionId,
  $currentCwd,
  $selectedStoredSessionId,
  $sessions,
  $workspaceCwdOwner,
  sessionMatchesStoredId
} from '@/store/session'
import { ambientGatewayOwnsEverySession } from '@/store/session-owner-resolution'
import { $sessionOwnerHoldRevision, $sessionStates, $sessionTiles, knownOwnerForSession } from '@/store/session-states'

/** The titlebar belongs to the window's selected conversation. Runtime feeds
 * and durable history must resolve through the same selected identity. */
export function useSummarySession() {
  const storedId = useStore($selectedStoredSessionId)
  const currentCwd = useStore($currentCwd)
  const cwdOwner = useStore($workspaceCwdOwner)
  const activeRuntimeId = useStore($activeSessionId)
  const connectionId = useStore($activeConnectionId)
  const activeProfile = useStore($activeGatewayProfile)
  const sessions = useStore($sessions)
  useStore($sessionTiles)
  useStore($sessionOwnerHoldRevision)

  const boundStoredId = useStoreSelector($sessionStates, states =>
    activeRuntimeId ? states[activeRuntimeId]?.storedSessionId : null
  )

  const row = sessions.find(session => storedId && sessionMatchesStoredId(session, storedId))

  const runtimeId =
    storedId && boundStoredId && (boundStoredId === storedId || (row && sessionMatchesStoredId(row, boundStoredId)))
      ? activeRuntimeId
      : null

  const busy = useStoreSelector($sessionStates, states => (runtimeId ? Boolean(states[runtimeId]?.busy) : false))
  const owner = knownOwnerForSession(runtimeId ?? storedId)

  // A bare owner profile names the local profile pool, not the foreground
  // registry source (which may currently be a different remote machine).
  const ownerConnection =
    owner && typeof owner === 'object' ? owner.connectionId : typeof owner === 'string' ? 'local' : connectionId

  const ownerProfile = typeof owner === 'string' ? owner : (owner?.profile ?? row?.profile ?? activeProfile)

  const scope = useMemo(
    () => ({ connectionId: ownerConnection || 'local', profile: ownerProfile || 'default' }),
    [ownerConnection, ownerProfile]
  )

  const cwd = cwdOwner === storedId ? currentCwd : ''

  return { busy, cwd, owner, runtimeId, scope, storedId }
}

export type SummarySession = ReturnType<typeof useSummarySession>

/** Preview and terminal bridges follow the foreground connection. A pending
 * open must not continue through a different connection after a switch. */
export function summarySessionIsCurrent(session: SummarySession): boolean {
  return (
    (Boolean(session.owner) || ambientGatewayOwnsEverySession()) &&
    session.storedId === $selectedStoredSessionId.get() &&
    session.cwd === ($workspaceCwdOwner.get() === session.storedId ? $currentCwd.get() : '') &&
    session.scope.connectionId === ($activeConnectionId.get() || 'local') &&
    session.scope.profile === ($activeGatewayProfile.get() || 'default')
  )
}
