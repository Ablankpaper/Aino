import type { ErrorSurface } from '@/lib/error-surface'

import type { PlatformModel } from '../../shared/platform-contract'

import { platformModelCatalog, PlatformSelectionError } from './platform-models'

interface PlatformCatalogReader {
  account: { get(): ReturnType<typeof platformModelCatalog>['account'] extends { get(): infer T } ? T : never }
  state: { get(): ReturnType<typeof platformModelCatalog>['state'] extends { get(): infer T } ? T : never }
}

/** Catalog metadata is behavioral only after model id and stored owner agree. */
export function verifiedPlatformModelFrom(
  catalog: PlatformCatalogReader,
  modelId: string,
  ownerUserId: string
): PlatformModel | null {
  const account = catalog.account.get()
  const state = catalog.state.get()

  if (
    !modelId ||
    !ownerUserId ||
    account?.phase !== 'signed_in' ||
    account.account?.id !== ownerUserId ||
    state.phase !== 'ready'
  ) {
    return null
  }

  return state.models.find(model => model.id === modelId && model.state === 'available') ?? null
}

export function verifiedPlatformModel(modelId: string, ownerUserId: string): PlatformModel | null {
  return verifiedPlatformModelFrom(platformModelCatalog(), modelId, ownerUserId)
}

/** Stable managed failures must never offer an unchanged-turn replay. */
export function platformErrorSurface(error: unknown): ErrorSurface | null {
  if (!(error instanceof PlatformSelectionError)) {
    return null
  }

  const layer =
    error.code === 'insufficient_balance' || error.code === 'quota_exhausted' || error.code === 'managed_balance_unavailable'
      ? 'billing'
      : error.code === 'managed_auth_unavailable' ||
          error.code === 'managed_credential_expired' ||
          error.code === 'managed_credential_revoked' ||
          error.code === 'not_authenticated'
        ? 'auth'
        : 'gateway'

  return { code: error.code, layer, retryable: false }
}
