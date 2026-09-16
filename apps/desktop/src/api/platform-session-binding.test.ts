import { afterEach, expect, it, vi } from 'vitest'

import { platformAccountActions } from './platform'
import { platformModelCatalog } from '@/store/platform-models'
import { platformModel, platformSnapshot } from '@/test/platform-model'
import { createPlatformDraft } from './platform-session-binding'

afterEach(() => { Reflect.deleteProperty(window, 'hermesDesktop') })

it('binds on the owning chat socket before exposing a ready draft and keeps keys out of the result', async () => {
  const account = platformSnapshot()
  const order: string[] = []
  const desktop = { platformAccount: { status: async () => account, capabilities: async () => ({}), onChanged: () => () => {} },
    platformModels: { list: async () => [platformModel()], owner: async () => ({ user_id: 'user-a', platform_origin: 'http://127.0.0.1:1234' }),
      bind: async () => { order.push('bind'); return { ok: true, ready: true, model_id: 'catalog-a', billing_source: 'aino', expires_at: 'later' } },
      clear: vi.fn() } }
  Object.defineProperty(window, 'hermesDesktop', { configurable: true, value: desktop })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()
  await platformModelCatalog().load()
  const request = vi.fn(async (method: string) => {
    order.push(method)
    if (method === 'session.create') return { session_id: 'live', info: {
      model_source: 'aino', model_id: 'catalog-a', provider: 'aino', model_status: 'awaiting_managed_credentials' } }
    if (method === 'session.managed_model_ticket') return { managed_model_binding: 1, session_ticket: 'ticket' }
    throw new Error('unexpected request')
  })
  const created = await createPlatformDraft(request as never, { model_source: 'aino', model_id: 'catalog-a' },
    'user-a', { connectionId: 'local', profile: 'work' })
  expect(order).toEqual(['session.create', 'session.managed_model_ticket', 'bind'])
  expect(created.info).toMatchObject({
    model_id: 'catalog-a',
    model_status: 'ready',
    platform_owner: { user_id: 'user-a', platform_origin: 'http://127.0.0.1:1234' }
  })
  expect(desktop.platformModels.clear).not.toHaveBeenCalled()
  expect(request.mock.calls.find(([method]) => method === 'config.set')).toBeUndefined()
})
