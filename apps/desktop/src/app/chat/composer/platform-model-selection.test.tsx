import { QueryClient } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { platformAccountActions } from '@/api/platform'
import { useModelControls } from '@/app/session/hooks/use-model-controls'
import { getGlobalModelInfo } from '@/hermes'
import type * as Hermes from '@/hermes'
import {
  $activeSessionId,
  $currentModel,
  $currentProvider,
  setCurrentModel,
  setCurrentModelSource,
  setCurrentProvider
} from '@/store/session'
import { platformModel, platformSnapshot } from '@/test/platform-model'

vi.mock('@/hermes', async importOriginal => ({
  ...(await importOriginal<typeof Hermes>()),
  getGlobalModelInfo: vi.fn()
}))

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(window, 'hermesDesktop')
  $activeSessionId.set(null)
  setCurrentModel('')
  setCurrentProvider('')
  setCurrentModelSource('')
  vi.restoreAllMocks()
})

it('seeds a fresh unconfigured composer from the account catalog but preserves an explicit BYOK default', async () => {
  const snapshot = platformSnapshot()
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: {
      platformAccount: { status: async () => snapshot, capabilities: async () => ({}), onChanged: () => () => {} },
      platformModels: { list: async () => [platformModel()] }
    }
  })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()
  vi.mocked(getGlobalModelInfo).mockResolvedValue({ model: '', provider: '' })
  const { result } = renderHook(() => useModelControls({ queryClient: new QueryClient(), requestGateway: vi.fn() }))
  await act(() => result.current.refreshCurrentModel())
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['aino', 'catalog-a'])

  vi.mocked(getGlobalModelInfo).mockResolvedValue({ model: 'personal-model', provider: 'custom:local' })
  await act(() => result.current.refreshCurrentModel(true))
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:local', 'personal-model'])
})
