import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import {
  $gatewayManagedCapabilities,
  type ManagedModelRoute,
  managedModelRouteCapabilityFrom
} from '@/store/gateway-managed-capability'
import { platformModelCatalog } from '@/store/platform-models'

/** A platform session can be ready without configuring a persistent BYOK provider. */
export function usePlatformOnboardingReady(enabled: boolean, route: ManagedModelRoute): boolean {
  const catalog = platformModelCatalog()
  const account = useStore(catalog.account)
  const state = useStore(catalog.state)
  const capabilities = useStore($gatewayManagedCapabilities)
  const supported = managedModelRouteCapabilityFrom(capabilities, route) === 'supported'
  const signedIn = account?.phase === 'signed_in' && Boolean(account.account)

  useEffect(() => {
    if (enabled && supported && signedIn && state.phase === 'idle') {
      void catalog.load()
    }
  }, [catalog, enabled, signedIn, state.phase, supported])

  // The catalog already fences retained rows and pending responses by account
  // revision. Do not persist this fact as a globally configured BYOK provider.
  return enabled && supported && signedIn && state.models.some(model => model.state === 'available' && model.capabilities.tools)
}
