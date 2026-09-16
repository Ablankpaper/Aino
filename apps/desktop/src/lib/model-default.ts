import { getGlobalModelInfo, type ProfileScope } from '@/hermes'
import { platformDefaultScope } from '@/lib/platform-model-scope'
import { managedModelRouteCapability } from '@/store/gateway-managed-capability'
import { platformModelCatalog, PlatformSelectionError, readPlatformDefault } from '@/store/platform-models'

/** Resolve backend/default billing identity without publishing into the composer. */
export async function resolveModelDefault(scope: ProfileScope) {
  const catalog = platformModelCatalog()
  const account = catalog.account.get()
  const capturedScope = platformDefaultScope(scope)
  const preferredId = readPlatformDefault(account?.account?.id || '', capturedScope, account?.mode)
  const [result] = await Promise.all([getGlobalModelInfo(scope), catalog.load()])
  const currentAccount = catalog.account.get()

  if (
    account?.account?.id !== currentAccount?.account?.id ||
    account?.revision !== currentAccount?.revision ||
    account?.phase !== currentAccount?.phase ||
    account?.mode !== currentAccount?.mode ||
    capturedScope.key !== platformDefaultScope(scope).key ||
    preferredId !== readPlatformDefault(currentAccount?.account?.id || '', capturedScope, currentAccount?.mode)
  ) {
    throw new PlatformSelectionError('platform_account_changed')
  }

  const state = catalog.state.get()
  const managedSupported = managedModelRouteCapability(capturedScope.route) === 'supported'

  const platformDefault =
    managedSupported && state.phase === 'ready'
      ? state.models.find(model => model.state === 'available' && model.id === preferredId) ||
        state.models.find(model => model.is_default && model.state === 'available')
      : undefined

  if (!result.model && !result.provider && account?.phase === 'signed_in' && managedSupported && !platformDefault) {
    throw new PlatformSelectionError('model_unavailable')
  }

  const model = result.model || (result.provider ? '' : platformDefault?.id || '')
  const provider = result.provider || (model ? 'aino' : '')

  const platform =
    !result.model && !result.provider && provider === 'aino' && platformDefault?.id === model
      ? { modelId: model, ownerUserId: account?.account?.id || '' }
      : null

  return { model, provider, platform }
}
