import { type ConnectionState, type GatewayEvent, registryBackendScopeKey } from '@hermes/shared'
import { atom } from 'nanostores'

export type ManagedModelRouteCapability = 'supported' | 'unknown' | 'unsupported'

export interface ManagedModelRoute {
  connectionId?: null | string
  profile?: null | string
}

/** Exact socket-ready evidence. An open socket is not capability evidence. */
export const $gatewayManagedCapabilities = atom<Record<string, ManagedModelRouteCapability>>({})

function routeKey(route: ManagedModelRoute): string {
  return registryBackendScopeKey(route.connectionId, route.profile)
}

export function managedModelRouteCapability(route: ManagedModelRoute): ManagedModelRouteCapability {
  return managedModelRouteCapabilityFrom($gatewayManagedCapabilities.get(), route)
}

export function managedModelRouteCapabilityFrom(
  capabilities: Readonly<Record<string, ManagedModelRouteCapability>>,
  route: ManagedModelRoute
): ManagedModelRouteCapability {
  return capabilities[routeKey(route)] ?? 'unknown'
}

export function recordGatewayReadyCapability(route: ManagedModelRoute, event: GatewayEvent): void {
  if (event.type !== 'gateway.ready') {
    return
  }

  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {}
  const supported = (payload as { managed_model_binding?: unknown }).managed_model_binding === 1
  const key = routeKey(route)

  $gatewayManagedCapabilities.set({
    ...$gatewayManagedCapabilities.get(),
    [key]: supported ? 'supported' : 'unsupported'
  })
}

export function resetGatewayManagedCapability(route: ManagedModelRoute): void {
  const key = routeKey(route)
  const current = $gatewayManagedCapabilities.get()

  if (!(key in current)) {
    return
  }

  const next = { ...current }
  delete next[key]
  $gatewayManagedCapabilities.set(next)
}

export function recordGatewayCapabilityState(route: ManagedModelRoute, state: ConnectionState): void {
  if (state !== 'open') {
    resetGatewayManagedCapability(route)
  }
}

export function clearGatewayManagedCapabilities(): void {
  $gatewayManagedCapabilities.set({})
}
