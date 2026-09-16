import { resolveModelDefault } from '@/lib/model-default'
import { platformDefaultScope, type PlatformDefaultScopeInput } from '@/lib/platform-model-scope'

import type { PlatformAccountSnapshot } from '../../shared/platform-contract'

import {
  platformModelCatalog,
  PlatformSelectionError,
  requirePlatformSelection,
  writePlatformDefault
} from './platform-models'
import {
  $activeSessionId,
  $currentPlatformOwner,
  $currentProvider,
  $selectedStoredSessionId,
  getComposerSelectionGeneration,
  markComposerSelectionDefault,
  setCurrentModel,
  setCurrentPlatformOwner,
  setCurrentProvider
} from './session'

/** Account changes invalidate only unsent platform intent, never session metadata or user content. */
export function reconcilePlatformDraftAccount(next: PlatformAccountSnapshot) {
  if ($activeSessionId.get() || $selectedStoredSessionId.get() || $currentProvider.get() !== 'aino') {
    return
  }

  if (
    next.account?.id === $currentPlatformOwner.get() &&
    next.phase !== 'signed_out' &&
    next.phase !== 'reauth_required'
  ) {
    return
  }

  markComposerSelectionDefault()
  setCurrentModel('')
  setCurrentProvider('')
  setCurrentPlatformOwner('')
}

/** Settings saves a preference; only the matching empty composer may repaint. */
export async function savePlatformDraftDefault(
  account: PlatformAccountSnapshot,
  scope: PlatformDefaultScopeInput,
  modelId: string
) {
  const catalog = platformModelCatalog()

  if (catalog.account.get()?.mode !== account.mode || catalog.account.get()?.revision !== account.revision) {
    throw new PlatformSelectionError('platform_account_changed')
  }

  requirePlatformSelection(catalog.account.get(), catalog.state.get().models, modelId, account.account?.id || '')
  const captured = platformDefaultScope(scope)
  writePlatformDefault(account.account?.id || '', modelId, captured, account.mode)

  const matchesDraft = () =>
    !$activeSessionId.get() && !$selectedStoredSessionId.get() && captured.key === platformDefaultScope().key

  if (!matchesDraft()) {
    return
  }

  markComposerSelectionDefault()
  const generation = getComposerSelectionGeneration()
  const resolved = await resolveModelDefault(captured.route)

  if (!matchesDraft() || generation !== getComposerSelectionGeneration()) {
    return
  }

  setCurrentProvider(resolved.provider)
  setCurrentModel(resolved.model)
  setCurrentPlatformOwner(resolved.platform?.ownerUserId || '', resolved.platform?.platformOrigin || '')
}
