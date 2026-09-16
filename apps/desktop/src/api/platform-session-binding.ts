import type { PlatformSessionModel } from '@/lib/platform-session-model'
import type { PlatformModelOwner } from '@/store/platform-model-owner'
import { platformModelCatalog, PlatformSelectionError, requirePlatformSelection } from '@/store/platform-models'
import type { SessionOwnerScope } from '@/store/session-request-router'
import { $sessionStates } from '@/store/session-states'
import type { SessionCreateResponse } from '@/types/hermes'

import { bindPlatformModel } from './platform-models'

type Request = <T>(method: string, params?: Record<string, unknown>, timeoutMs?: number) => Promise<T>

function target(owner: SessionOwnerScope, sessionId: string) {
  return {
    connection_id: typeof owner === 'object' && owner ? owner.connectionId : '',
    profile: typeof owner === 'object' && owner ? owner.profile : owner || 'default',
    session_id: sessionId
  }
}

export async function bindSelectedPlatformSession(
  owner: SessionOwnerScope,
  sessionId: string,
  selection: PlatformSessionModel,
  request?: Request,
  requireKnownOwner = false
): Promise<PlatformModelOwner> {
  const catalog = platformModelCatalog()
  const account = catalog.account.get()

  if (account?.phase !== 'signed_in' || !account.account) {throw new PlatformSelectionError('not_authenticated')}

  if (selection.ownerUserId !== account.account.id) {throw new PlatformSelectionError('platform_account_changed')}

  await catalog.owner.load()
  const authoritativeOwner = catalog.owner.state.get().owner
  const current = catalog.account.get()

  if (
    current?.revision !== account.revision ||
    current?.mode !== account.mode ||
    current?.account?.id !== account.account.id ||
    !authoritativeOwner ||
    authoritativeOwner.user_id !== selection.ownerUserId ||
    (requireKnownOwner && !selection.platformOrigin) ||
    (selection.platformOrigin !== undefined && selection.platformOrigin !== authoritativeOwner.platform_origin)
  ) {
    throw new PlatformSelectionError('platform_account_changed')
  }

  const result = await bindPlatformModel(
    { ...target(owner, sessionId), model_id: selection.modelId, expected_account_revision: account.revision },
    account,
    request
  )

  if (!result.ok) {throw new PlatformSelectionError(result.error.code)}

  if (catalog.account.get()?.revision !== account.revision) {throw new PlatformSelectionError('platform_account_changed')}

  return authoritativeOwner
}

export async function createPlatformDraft(
  request: Request,
  params: Record<string, unknown>,
  ownerUserId: string,
  owner: SessionOwnerScope
): Promise<SessionCreateResponse> {
  if (params.model_source !== 'aino') {return request('session.create', params)}
  const catalog = platformModelCatalog()
  const modelId = String(params.model_id || '')
  requirePlatformSelection(catalog.account.get(), catalog.state.get().models, modelId, ownerUserId)
  const created = await request<SessionCreateResponse>('session.create', params)

  try {
    if (created.info?.model_source !== 'aino' || created.info.model_id !== modelId) {
      throw new PlatformSelectionError('unsupported_gateway')
    }

    const authoritativeOwner = await bindSelectedPlatformSession(
      owner,
      created.session_id,
      { modelId, ownerUserId, status: 'awaiting_managed_credentials' },
      request
    )

    return {
      ...created,
      info: { ...created.info, model_status: 'ready', platform_owner: authoritativeOwner }
    }
  } catch (error) {
    await request('session.close', { session_id: created.session_id }).catch(() => undefined)
    await clearPlatformSession(owner, created.session_id)
    throw error
  }
}

export async function clearPlatformSession(owner: SessionOwnerScope, sessionId: string): Promise<void> {
  await window.hermesDesktop?.platformModels?.clear(target(owner, sessionId))
}

export async function preparePlatformSessionRequest(
  owner: SessionOwnerScope,
  method: string,
  params: Record<string, unknown>,
  request: Request
): Promise<void> {
  if (method !== 'prompt.submit' || typeof params.session_id !== 'string') {return}
  const state = $sessionStates.get()[params.session_id]

  if (state?.provider !== 'aino') {return}

  if (!state.platformModel) {throw new PlatformSelectionError('model_unavailable')}
  await bindSelectedPlatformSession(owner, params.session_id, state.platformModel, request, true)
}
