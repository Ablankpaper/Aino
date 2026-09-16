import { QueryClient } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { platformAccountActions } from '@/api/platform'
import { modelOptionsQueryKey } from '@/lib/model-options'
import { platformModelCatalog } from '@/store/platform-models'
import { $activeGatewayProfile } from '@/store/profile'
import {
  $activeSessionId,
  $busy,
  $currentModel,
  $currentProvider,
  setCurrentModel,
  setCurrentPlatformOwner,
  setCurrentProvider
} from '@/store/session'
import {
  $sessionStates,
  publishSessionState,
  type SessionTileDelegate,
  setSessionTileDelegate
} from '@/store/session-states'
import { deferred } from '@/test/deferred'
import { platformModel, platformSnapshot } from '@/test/platform-model'

import { useModelControls } from './use-model-controls'

const notices = vi.hoisted(() => ({ notify: vi.fn(), notifyError: vi.fn(), dismissNotification: vi.fn() }))
vi.mock('@/store/notifications', () => notices)

let backend = { model: 'byok-old', provider: 'custom:test' } as Record<string, unknown>
let bind: ReturnType<typeof vi.fn>
let clear: ReturnType<typeof vi.fn>
let request: ReturnType<typeof vi.fn>
let broadcast: (snapshot: ReturnType<typeof platformSnapshot>) => void

beforeEach(async () => {
  vi.clearAllMocks()
  $activeGatewayProfile.set('default')
  $activeSessionId.set('runtime-a')
  $busy.set(false)
  setCurrentProvider('custom:test')
  setCurrentModel('byok-old')
  setCurrentPlatformOwner('')
  $sessionStates.set({
    'runtime-a': { model: 'byok-old', provider: 'custom:test', busy: false, messages: [] }
  } as never)
  setSessionTileDelegate({
    updateSession: (id: string, update: Parameters<SessionTileDelegate['updateSession']>[1]) => {
      const previous = $sessionStates.get()[id]

      if (previous) {
        publishSessionState(id, update(previous))
      }
    }
  } as never)
  backend = { model: 'byok-old', provider: 'custom:test' }
  bind = vi.fn(async () => {
    backend.model_status = 'ready'

    return { ok: true }
  })
  clear = vi.fn(async () => undefined)
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: {
      platformAccount: {
        status: async () => platformSnapshot(),
        capabilities: async () => ({}),
        onChanged: (listener: typeof broadcast) => {
          broadcast = listener

          return () => {}
        }
      },
      platformModels: {
        list: async () => [platformModel(), platformModel('catalog-b')],
        owner: async () => ({}),
        bind,
        clear
      }
    }
  })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()
  await platformModelCatalog().load()
  request = vi.fn(async (method, params) => {
    if (method === 'config.set') {
      backend =
        params.model_source === 'aino'
          ? {
              provider: 'aino',
              model_id: params.value,
              model_source: 'aino',
              model_status: 'awaiting_managed_credentials',
              platform_owner: { user_id: 'user-a' }
            }
          : { provider: 'custom:test', model: params.value.split(' ')[0] }

      return {}
    }

    if (method === 'session.managed_model_ticket') {
      return { managed_model_binding: 1, session_ticket: 'fixture' }
    }

    if (method === 'model.options') {
      return { session_info: backend, providers: [] }
    }

    throw new Error(method)
  })
})

afterEach(() => {
  cleanup()
  $activeSessionId.set(null)
  $sessionStates.set({})
  $busy.set(false)
  $activeGatewayProfile.set('default')
  Reflect.deleteProperty(window, 'hermesDesktop')
})

function controls() {
  return renderHook(() => useModelControls({ queryClient: new QueryClient(), requestGateway: request as never })).result
}

it('reconciles staged binding failure and retries authorization without replaying config or a prompt', async () => {
  bind.mockResolvedValueOnce({ ok: false, error: { code: 'gateway_binding_failed' } })
  const result = controls()
  await act(async () => expect(await result.current.selectModel({ provider: 'aino', model: 'catalog-a' })).toBe(false))
  expect($sessionStates.get()['runtime-a'].platformModel).toMatchObject({
    modelId: 'catalog-a',
    status: 'awaiting_managed_credentials'
  })
  expect(request).toHaveBeenCalledWith('model.options', {
    session_id: 'runtime-a',
    profile: 'default',
    include_session_info: true
  })
  const retry = notices.notify.mock.calls.at(-1)?.[0]?.action
  expect(retry).toBeDefined()
  await act(() => retry.onClick())
  expect($sessionStates.get()['runtime-a'].platformModel?.status).toBe('ready')
  expect(request.mock.calls.filter(([method]) => method === 'config.set')).toHaveLength(1)
  expect(request.mock.calls.some(([method]) => method === 'prompt.submit')).toBe(false)
})

it('keeps authoritative BYOK after native cleanup fails and rejects busy managed switches before painting', async () => {
  setCurrentProvider('aino')
  setCurrentModel('catalog-a')
  setCurrentPlatformOwner('user-a')
  $sessionStates.set({
    'runtime-a': {
      ...$sessionStates.get()['runtime-a'],
      provider: 'aino',
      model: 'catalog-a',
      platformModel: { modelId: 'catalog-a', ownerUserId: 'user-a', status: 'ready' },
      busy: true
    }
  })
  const result = controls()
  await act(async () =>
    expect(await result.current.selectModel({ provider: 'custom:test', model: 'byok-new' })).toBe(false)
  )
  expect(request).not.toHaveBeenCalled()
  expect($currentProvider.get()).toBe('aino')
  $sessionStates.set({ 'runtime-a': { ...$sessionStates.get()['runtime-a'], busy: false } })
  clear.mockRejectedValueOnce(new Error('cleanup failed'))
  await act(async () =>
    expect(await result.current.selectModel({ provider: 'custom:test', model: 'byok-new' })).toBe(false)
  )
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:test', 'byok-new'])
  expect($sessionStates.get()['runtime-a'].platformModel).toBeNull()
  expect(request).toHaveBeenCalledWith('model.options', {
    session_id: 'runtime-a',
    profile: 'default',
    include_session_info: true
  })

  request.mockClear()
  $sessionStates.set({ 'runtime-a': { ...$sessionStates.get()['runtime-a'], awaitingResponse: true } })
  await act(async () => expect(await result.current.selectModel({ provider: 'aino', model: 'catalog-b' })).toBe(false))
  expect(request).not.toHaveBeenCalled()
  expect($currentProvider.get()).toBe('custom:test')
})

it('awaits one managed selection and keeps completion on its original tile after navigation', async () => {
  const pending = deferred<{ ok: boolean }>()
  bind.mockReturnValueOnce(pending.promise)
  const result = controls()
  const switchPromise = result.current.selectModel({ provider: 'aino', model: 'catalog-a' })
  await act(async () => {})
  await expect(result.current.selectModel({ provider: 'aino', model: 'catalog-b' })).resolves.toBe(false)
  $activeSessionId.set('runtime-b')
  setCurrentModel('other-model')
  setCurrentProvider('other-provider')
  backend.model_status = 'ready'
  pending.resolve({ ok: true })
  await act(() => switchPromise)
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['other-provider', 'other-model'])
  expect($sessionStates.get()['runtime-a'].platformModel?.status).toBe('ready')
})

it('fences stale confirmations and an account transition during accepted config before requesting funding', async () => {
  request.mockResolvedValueOnce({ confirm_required: true, confirm_message: 'Switch model?' })
  const result = controls()
  await act(async () => expect(await result.current.selectModel({ provider: 'aino', model: 'catalog-a' })).toBe(false))
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:test', 'byok-old'])
  const confirm = notices.notify.mock.calls.at(-1)?.[0]?.action
  act(() => broadcast(platformSnapshot('user-b', 2)))
  await act(() => confirm.onClick())
  expect(request.mock.calls.filter(([method]) => method === 'config.set')).toHaveLength(1)
  expect(bind).not.toHaveBeenCalled()

  act(() => broadcast(platformSnapshot('user-a', 3)))
  await platformModelCatalog().load()
  const pending = deferred<object>()
  request.mockReturnValueOnce(pending.promise)
  const switched = result.current.selectModel({ provider: 'aino', model: 'catalog-a' })
  act(() => broadcast(platformSnapshot('user-b', 4)))
  setCurrentProvider('custom:other')
  setCurrentModel('new-owner-model')
  pending.resolve({})
  await act(async () => expect(await switched).toBe(false))
  expect(bind).not.toHaveBeenCalled()
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:other', 'new-owner-model'])
})

it('rolls back a rejected managed config but reconciles a lost acknowledgement of a staged model', async () => {
  const result = controls()
  request.mockRejectedValueOnce(new Error('write rejected'))
  await act(async () => expect(await result.current.selectModel({ provider: 'aino', model: 'catalog-a' })).toBe(false))
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:test', 'byok-old'])
  expect($sessionStates.get()['runtime-a'].platformModel).toBeFalsy()
  request.mockImplementationOnce(async () => {
    backend = {
      provider: 'aino',
      model_id: 'catalog-a',
      model_source: 'aino',
      model_status: 'awaiting_managed_credentials'
    }
    throw new Error('acknowledgement lost')
  })
  await act(async () => expect(await result.current.selectModel({ provider: 'aino', model: 'catalog-a' })).toBe(false))
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['aino', 'catalog-a'])
  expect($sessionStates.get()['runtime-a'].platformModel).toMatchObject({
    modelId: 'catalog-a',
    status: 'awaiting_managed_credentials'
  })
  expect(notices.notify.mock.calls.at(-1)?.[0]?.action).toBeDefined()
  expect(bind).not.toHaveBeenCalled()
})

it('confirms Aino-to-Aino on a secondary tile and keeps its binding/cache on the captured profile', async () => {
  $sessionStates.set({
    ...$sessionStates.get(),
    'runtime-b': {
      ...$sessionStates.get()['runtime-a'],
      model: 'catalog-a',
      provider: 'aino',
      platformModel: { modelId: 'catalog-a', ownerUserId: 'user-a', status: 'ready' }
    }
  })
  const client = new QueryClient()

  const { result } = renderHook(() =>
    useModelControls({
      queryClient: client,
      cacheOwnerConnectionId: 'connection-b',
      cacheProfile: 'profile-b',
      requestGateway: request as never
    })
  )

  request.mockResolvedValueOnce({ confirm_required: true, confirm_message: 'Switch model?' })
  await act(async () =>
    expect(await result.current.selectModel({ provider: 'aino', model: 'catalog-b', sessionId: 'runtime-b' })).toBe(
      false
    )
  )
  const confirm = notices.notify.mock.calls.at(-1)?.[0]?.action
  const pending = deferred<{ ok: boolean }>()
  bind.mockReturnValueOnce(pending.promise)
  const confirming = confirm.onClick()
  await act(async () => {})
  $activeGatewayProfile.set('profile-c')
  setCurrentProvider('custom:c')
  setCurrentModel('model-c')
  backend.model_status = 'ready'
  pending.resolve({ ok: true })
  await act(() => confirming)
  expect(bind).toHaveBeenCalledWith(
    expect.objectContaining({
      connection_id: 'connection-b',
      profile: 'profile-b',
      session_id: 'runtime-b',
      model_id: 'catalog-b'
    })
  )
  expect($sessionStates.get()['runtime-b'].platformModel).toMatchObject({ modelId: 'catalog-b', status: 'ready' })
  expect(client.getQueryData(modelOptionsQueryKey('profile-b', 'runtime-b', 'connection-b'))).toMatchObject({
    provider: 'aino',
    model: 'catalog-b'
  })
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:c', 'model-c'])
})
