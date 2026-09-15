import { requestGatewayForAgent } from '@/store/gateway'

import type {
  BindPlatformModelInput,
  BindPlatformModelResult,
  PlatformAccountSnapshot
} from '../../shared/platform-contract'

/** Only the chat's owning socket can delegate a live session to Electron main. */
export async function bindPlatformModel(
  input: BindPlatformModelInput,
  account: PlatformAccountSnapshot
): Promise<BindPlatformModelResult> {
  if (account.phase !== 'signed_in' || !account.account || account.revision !== input.expected_account_revision) {
    return { ok: false, error: { code: 'stale_account_revision' } }
  }

  const desktop = window.hermesDesktop

  if (!desktop?.platformModels) {
    return { ok: false, error: { code: 'unsupported_desktop' } }
  }

  try {
    const owner = await desktop.platformModels.owner(input.expected_account_revision)

    const ticket = await requestGatewayForAgent<{ managed_model_binding?: number; session_ticket?: string }>(
      input.connection_id || null,
      input.profile,
      'session.managed_model_ticket',
      { session_id: input.session_id, model_id: input.model_id, owner },
      10_000
    )

    if (ticket.managed_model_binding !== 1 || !ticket.session_ticket) {
      return { ok: false, error: { code: 'unsupported_gateway' } }
    }

    return await desktop.platformModels.bind({ ...input, session_ticket: ticket.session_ticket })
  } catch {
    return { ok: false, error: { code: 'gateway_binding_failed' } }
  }
}
