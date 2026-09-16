import { getGlobalModelInfo, type ProfileScope } from '@/hermes'
import { platformModelCatalog, PlatformSelectionError, readPlatformDefault } from '@/store/platform-models'

/** Resolve backend/default billing identity without publishing into the composer. */
export async function resolveModelDefault(scope: ProfileScope) {
  const catalog = platformModelCatalog()
  const account = catalog.account.get()
  const preferredId = readPlatformDefault(account?.account?.id || '')
  const [result] = await Promise.all([getGlobalModelInfo(scope), catalog.load()])
  const currentAccount = catalog.account.get()

  if (
    account?.account?.id !== currentAccount?.account?.id ||
    account?.revision !== currentAccount?.revision ||
    account?.phase !== currentAccount?.phase ||
    preferredId !== readPlatformDefault(currentAccount?.account?.id || '')
  ) {
    throw new PlatformSelectionError('platform_account_changed')
  }

  const state = catalog.state.get()

  const platformDefault =
    state.phase === 'ready'
      ? state.models.find(model => model.state === 'available' && model.id === preferredId) ||
        state.models.find(model => model.is_default && model.state === 'available')
      : undefined

  if (!result.model && !result.provider && account?.phase === 'signed_in' && !platformDefault) {
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
