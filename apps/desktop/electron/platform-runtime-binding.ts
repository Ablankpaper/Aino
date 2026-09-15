/**
 * Platform managed model runtime binding controller.
 *
 * Securely transmits platform credentials from main process to authenticated
 * gateway connections without leaking secrets to renderer.
 */

import type { BindPlatformModelInput, BindPlatformModelResult, PlatformModel } from '../shared/platform-contract'
import type { PlatformAuth } from './platform-auth'
import type { PlatformClient } from './platform-client'

export interface PlatformRuntimeBindingController {
  bind(input: BindPlatformModelInput): Promise<BindPlatformModelResult>
  list(): Promise<PlatformModel[]>
}

export function createPlatformRuntimeBindingController({
  auth,
  client,
  resolveConnection,
  sendGatewayRpc
}: {
  auth: PlatformAuth
  client: PlatformClient
  resolveConnection: (connectionId: string, profile: string) => Promise<{ ws_url: string } | null>
  sendGatewayRpc: (wsUrl: string, method: string, params: unknown) => Promise<unknown>
}): PlatformRuntimeBindingController {
  return {
    async bind(input: BindPlatformModelInput): Promise<BindPlatformModelResult> {
      // Validate input
      const connectionId = String(input.connection_id || '').trim()
      const profile = String(input.profile || '').trim()
      const sessionId = String(input.session_id || '').trim()
      const modelId = String(input.model_id || '').trim()
      const expectedRevision = Number(input.expected_account_revision)

      if (!sessionId || !modelId) {
        return { ok: false, error: { code: 'invalid_input', message: 'session_id and model_id required' } }
      }

      // Check account state
      const snapshot = auth.snapshot()
      if (snapshot.phase !== 'signed_in' || !snapshot.account) {
        return { ok: false, error: { code: 'not_authenticated', message: 'User not authenticated' } }
      }

      // Validate account revision
      if (snapshot.revision !== expectedRevision) {
        return {
          ok: false,
          error: { code: 'stale_account_revision', message: 'Account state has changed since request was initiated' }
        }
      }

      // Resolve connection (validate connection exists and get WS URL)
      const connection = await resolveConnection(connectionId, profile)
      if (!connection) {
        return { ok: false, error: { code: 'connection_not_found', message: 'Connection not found' } }
      }

      // Fetch platform model lease (contains secrets)
      let lease
      try {
        const tokens = auth.snapshot().account
        if (!tokens) {
          return { ok: false, error: { code: 'no_credentials', message: 'No credentials available' } }
        }

        // Get access token from auth (this is internal, renderer never sees it)
        const accessToken = await auth.refresh().then(s => (s.account as any)?.accessToken)
        if (!accessToken) {
          return { ok: false, error: { code: 'no_access_token', message: 'Failed to get access token' } }
        }

        lease = await client.modelLease(accessToken, modelId)
      } catch (error) {
        return {
          ok: false,
          error: {
            code: typeof (error as any)?.code === 'string' ? (error as any).code : 'platform_error',
            message: error instanceof Error ? error.message : 'Failed to fetch model lease'
          }
        }
      }

      // Send binding to gateway via RPC (secrets stay in main process)
      try {
        await sendGatewayRpc(connection.ws_url, 'session.bind_managed_model', {
          session_id: sessionId,
          owner: {
            platform_origin: client.origin,
            user_id: snapshot.account.id
          },
          model_id: modelId,
          model: lease.model,
          api_mode: lease.api_mode,
          capabilities: lease.capabilities,
          credential_id: lease.credential_id,
          api_key: lease.api_key,
          base_url: lease.base_url,
          expires_at: lease.expires_at,
          binding_revision: snapshot.revision
        })
      } catch (error) {
        return {
          ok: false,
          error: {
            code: 'gateway_error',
            message: error instanceof Error ? error.message : 'Failed to bind model to gateway'
          }
        }
      }

      // Return safe result (no secrets)
      return {
        ok: true,
        credential_id: lease.credential_id,
        expires_at: lease.expires_at
      }
    },

    async list(): Promise<PlatformModel[]> {
      const snapshot = auth.snapshot()
      if (snapshot.phase !== 'signed_in' || !snapshot.account) {
        return []
      }

      try {
        const accessToken = await auth.refresh().then(s => (s.account as any)?.accessToken)
        if (!accessToken) {
          return []
        }

        const models = await client.models(accessToken)
        return models.map(m => ({
          id: m.id,
          display_name: m.display_name,
          provider_label: m.provider_label
        }))
      } catch {
        return []
      }
    }
  }
}
