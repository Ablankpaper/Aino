import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { platformAccountActions } from '@/api/platform'
import { clearGatewayManagedCapabilities, recordGatewayReadyCapability } from '@/store/gateway-managed-capability'
import { $desktopOnboarding } from '@/store/onboarding'
import { platformModel, platformSnapshot } from '@/test/platform-model'

import type { PlatformAccountSnapshot, PlatformModel } from '../../../shared/platform-contract'

import { DesktopOnboardingOverlay } from '.'

const requestGateway = async <T,>(method: string): Promise<T> => {
  if (method === 'setup.status') {
    return { provider_configured: false } as T
  }

  if (method === 'setup.runtime_check') {
    return { ok: false, error: 'No inference provider is configured.' } as T
  }

  throw new Error(`Unexpected onboarding request: ${method}`)
}

async function installAccount(list: () => Promise<PlatformModel[]>) {
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
      platformModels: { list }
    }
  })
  await platformAccountActions(window.hermesDesktop.platformAccount).refresh()
  $desktopOnboarding.set({
    configured: false,
    flow: { status: 'idle' },
    mode: 'oauth',
    providers: [],
    reason: null,
    requested: false,
    firstRunSkipped: false,
    manual: false,
    localEndpoint: false
  })

  return (snapshot: PlatformAccountSnapshot) => act(() => changed(snapshot))
}

afterEach(() => {
  cleanup()
  clearGatewayManagedCapabilities()
  Reflect.deleteProperty(window, 'hermesDesktop')
  window.localStorage.clear()
  $desktopOnboarding.set({ ...$desktopOnboarding.get(), configured: null, manual: false })
})

it('reveals the workspace when the exact backend becomes ready for an available platform model without marking BYOK configured', async () => {
  await installAccount(async () => [platformModel()])

  const view = render(
    <DesktopOnboardingOverlay enabled ownerConnectionId="source-a" profile="default" requestGateway={requestGateway} />
  )

  expect(screen.getByRole('button', { name: "I'll choose a provider later" })).toBeTruthy()

  act(() => recordGatewayReadyCapability(
    { connectionId: 'source-b', profile: 'default' },
    { type: 'gateway.ready', payload: { managed_model_binding: 1 } }
  ))
  expect(screen.getByRole('button', { name: "I'll choose a provider later" })).toBeTruthy()
  act(() => recordGatewayReadyCapability(
    { connectionId: 'source-a', profile: 'default' },
    { type: 'gateway.ready', payload: { managed_model_binding: 1 } }
  ))
  await waitFor(() => expect(view.container.childElementCount).toBe(0))
  expect($desktopOnboarding.get().configured).toBe(false)
  expect(window.localStorage.getItem('hermes-desktop-onboarded-v1')).toBeNull()
  expect(window.localStorage.getItem('hermes-onboarding-skipped-v1')).toBeNull()

  act(() => $desktopOnboarding.set({ ...$desktopOnboarding.get(), manual: true }))
  expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
})

it('does not adopt a late foreign catalog or treat an unavailable model as configured', async () => {
  let resolve!: (models: PlatformModel[]) => void
  let calls = 0

  const changeAccount = await installAccount(() => {
    calls += 1

    return calls === 1
      ? new Promise<PlatformModel[]>(done => { resolve = done })
      : Promise.resolve([{ ...platformModel(), state: 'insufficient_balance' }])
  })

  recordGatewayReadyCapability(
    { connectionId: 'source-a', profile: 'default' },
    { type: 'gateway.ready', payload: { managed_model_binding: 1 } }
  )
  render(<DesktopOnboardingOverlay enabled ownerConnectionId="source-a" profile="default" requestGateway={requestGateway} />)
  await waitFor(() => expect(calls).toBe(1))
  changeAccount(platformSnapshot('user-b', 2))
  await act(async () => resolve([platformModel()]))
  await waitFor(() => expect(calls).toBe(2))
  expect(screen.getByRole('button', { name: "I'll choose a provider later" })).toBeTruthy()
  changeAccount({ ...platformSnapshot('user-b', 3), phase: 'signed_out', account: null })
  expect(screen.getByRole('button', { name: "I'll choose a provider later" })).toBeTruthy()
})
