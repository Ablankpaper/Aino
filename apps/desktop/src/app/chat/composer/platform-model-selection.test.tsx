import { QueryClient } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { platformAccountActions } from '@/api/platform'
import { useModelControls } from '@/app/session/hooks/use-model-controls'
import { getGlobalModelInfo } from '@/hermes'
import type * as Hermes from '@/hermes'
import { $composerAttachments, $composerDraft } from '@/store/composer'
import { clearGatewayManagedCapabilities, recordGatewayReadyCapability } from '@/store/gateway-managed-capability'
import { writePlatformDefault } from '@/store/platform-models'
import {
  $activeSessionId,
  $currentCwd,
  $currentModel,
  $currentPlatformOwner,
  $currentProvider,
  markComposerSelectionManual,
  setCurrentModel,
  setCurrentModelSource,
  setCurrentPlatformOwner,
  setCurrentProvider
} from '@/store/session'
import { platformModel, platformSnapshot } from '@/test/platform-model'

import type { PlatformAccountSnapshot } from '../../../../shared/platform-contract'

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
  clearGatewayManagedCapabilities()
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
  recordGatewayReadyCapability({ profile: 'default' }, { type: 'gateway.ready', payload: { managed_model_binding: 1 } })
  vi.mocked(getGlobalModelInfo).mockResolvedValue({ model: '', provider: '' })
  const { result } = renderHook(() => useModelControls({ queryClient: new QueryClient(), requestGateway: vi.fn() }))
  await act(() => result.current.refreshCurrentModel())
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['aino', 'catalog-a'])

  vi.mocked(getGlobalModelInfo).mockResolvedValue({ model: 'personal-model', provider: 'custom:local' })
  await act(() => result.current.refreshCurrentModel(true))
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:local', 'personal-model'])
})

it('does not apply an automatic Aino default without ready evidence and still preserves BYOK', async () => {
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
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['', ''])

  vi.mocked(getGlobalModelInfo).mockResolvedValue({ model: 'personal-model', provider: 'custom:local' })
  await act(() => result.current.refreshCurrentModel(true))
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:local', 'personal-model'])
})

it('reconciles account broadcasts without losing draft content, project or BYOK intent', async () => {
  let changed!: (snapshot: PlatformAccountSnapshot) => void
  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: {
      platformAccount: {
        status: async () => platformSnapshot(),
        capabilities: async () => ({}),
        onChanged: (listener: typeof changed) => {
          changed = listener

          return () => {}
        }
      },
      platformModels: { list: async () => [platformModel(), platformModel('catalog-b')] }
    }
  })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()
  recordGatewayReadyCapability({ profile: 'default' }, { type: 'gateway.ready', payload: { managed_model_binding: 1 } })
  vi.mocked(getGlobalModelInfo).mockResolvedValue({ model: '', provider: '' })
  setCurrentProvider('aino')
  setCurrentModel('catalog-a')
  setCurrentPlatformOwner('user-a')
  markComposerSelectionManual()
  $composerDraft.set('keep my work')
  const attachments = [{ id: 'file', label: 'notes.md', kind: 'file' as const, path: '/project/notes.md' }]
  $composerAttachments.set(attachments)
  $currentCwd.set('/project')
  writePlatformDefault('user-b', 'catalog-b', undefined, 'development')
  renderHook(() => useModelControls({ queryClient: new QueryClient(), requestGateway: vi.fn() }))
  act(() => changed({ ...platformSnapshot(), phase: 'signed_out', account: null, revision: 2 }))
  expect([$currentProvider.get(), $currentModel.get(), $currentPlatformOwner.get()]).toEqual(['', '', ''])
  act(() => changed(platformSnapshot('user-b', 3)))
  await waitFor(() =>
    expect([$currentProvider.get(), $currentModel.get(), $currentPlatformOwner.get()]).toEqual([
      'aino',
      'catalog-b',
      'user-b'
    ])
  )
  expect($composerDraft.get()).toBe('keep my work')
  expect($composerAttachments.get()).toBe(attachments)
  expect($currentCwd.get()).toBe('/project')
  setCurrentProvider('custom:local')
  setCurrentModel('my-byok')
  setCurrentPlatformOwner('')
  markComposerSelectionManual()
  act(() => changed(platformSnapshot('user-c', 4)))
  await act(async () => {})
  expect([$currentProvider.get(), $currentModel.get()]).toEqual(['custom:local', 'my-byok'])
})
