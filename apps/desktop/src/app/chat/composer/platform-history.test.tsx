import { QueryClient } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { platformAccountActions } from '@/api/platform'
import { useModelControls } from '@/app/session/hooks/use-model-controls'
import { createClientSessionState } from '@/lib/chat-runtime'
import { $freshSessionRequest } from '@/store/profile'
import { $activeSessionId } from '@/store/session'
import { $sessionStates } from '@/store/session-states'
import { platformSnapshot } from '@/test/platform-model'

import type { PlatformAccountSnapshot } from '../../../../shared/platform-contract'

import { PlatformHistoryNotice, usePlatformHistoryOwner } from './platform-history'

afterEach(() => {
  cleanup()
  $sessionStates.set({})
  $activeSessionId.set(null)
  Reflect.deleteProperty(window, 'hermesDesktop')
})

it('rejects an overlay model change on another account history before staging any config', async () => {
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: {
      platformAccount: {
        status: async () => platformSnapshot('user-b'),
        capabilities: async () => ({}),
        onChanged: () => () => {}
      },
      platformModels: { list: async () => [] }
    }
  })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()

  const history = {
    ...createClientSessionState('stored-a'),
    provider: 'aino',
    model: 'catalog-a',
    platformModel: { ownerUserId: 'user-a', modelId: 'catalog-a', status: 'ready' as const }
  }

  $sessionStates.set({ 'runtime-a': history })
  $activeSessionId.set('runtime-a')
  const request = vi.fn().mockResolvedValue({})
  const { result } = renderHook(() => useModelControls({ queryClient: new QueryClient(), requestGateway: request }))
  let applied: boolean | undefined
  await act(async () => {
    applied = await result.current.selectModel({ model: 'byok-model', provider: 'custom:mine' })
  })
  expect(applied).toBe(false)
  expect(request).not.toHaveBeenCalled()
  expect($sessionStates.get()['runtime-a']).toBe(history)
})

it('keeps original account history read-only and requests a new chat without rewriting its ownership', async () => {
  let changed!: (snapshot: PlatformAccountSnapshot) => void
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: {
      platformAccount: {
        status: async () => platformSnapshot('user-b'),
        capabilities: async () => ({}),
        onChanged: (listener: typeof changed) => {
          changed = listener

          return () => {}
        }
      },
      platformModels: { list: async () => [] }
    }
  })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()

  const history = {
    ...createClientSessionState('stored-a'),
    provider: 'aino',
    model: 'catalog-a',
    platformModel: { ownerUserId: 'user-a', modelId: 'catalog-a', status: 'ready' as const }
  }

  $sessionStates.set({ 'runtime-a': history })

  function History() {
    const owner = usePlatformHistoryOwner('runtime-a')

    return (
      <>
        <button disabled={owner !== null}>Send</button>
        {owner !== null && <PlatformHistoryNotice ownerUserId={owner} />}
      </>
    )
  }

  render(<History />)
  expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByRole('status').textContent).toContain('user-a')
  const prior = $freshSessionRequest.get()
  fireEvent.click(screen.getByRole('button', { name: /New chat/ }))
  expect($freshSessionRequest.get()).toBe(prior + 1)
  expect($sessionStates.get()['runtime-a']).toBe(history)
  act(() => changed(platformSnapshot('user-a', 2)))
  expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(false)
  expect(screen.queryByRole('status')).toBeNull()
})
