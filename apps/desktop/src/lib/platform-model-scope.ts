import { capabilityScoped, type ProfileScope } from '@/api/client'
import { activeConnectionScopeSuffix } from '@/lib/connection-scoped'

export interface PlatformDefaultScope {
  route: { connectionId?: string; profile: string }
  key: string
}

export type PlatformDefaultScopeInput = ProfileScope | PlatformDefaultScope

/** Capture the same route used by profile REST reads before starting async work. */
export function platformDefaultScope(scope?: PlatformDefaultScopeInput): PlatformDefaultScope {
  if (scope && typeof scope === 'object' && 'route' in scope) {
    return scope
  }

  const route = capabilityScoped(scope)
  const profile = route.profile?.trim() || 'default'
  const connection = route.connectionId || activeConnectionScopeSuffix(false) || 'legacy-local'

  return { route: { ...route, profile }, key: JSON.stringify([connection, profile]) }
}
