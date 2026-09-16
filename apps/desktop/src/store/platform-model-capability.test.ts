import { atom } from 'nanostores'
import { expect, it } from 'vitest'

import { platformModel, platformSnapshot } from '../test/platform-model'

import { platformErrorSurface, verifiedPlatformModelFrom } from './platform-model-capability'
import { createPlatformModelCatalog, PlatformSelectionError } from './platform-models'

it('requires a ready catalog model and its stored account owner', async () => {
  const account = atom(platformSnapshot())
  const catalog = createPlatformModelCatalog(account, async () => [platformModel()])
  await catalog.load()

  expect(verifiedPlatformModelFrom(catalog, 'catalog-a', 'user-a')?.id).toBe('catalog-a')
  expect(verifiedPlatformModelFrom(catalog, 'catalog-a', 'other-user')).toBeNull()
  expect(verifiedPlatformModelFrom(catalog, 'missing', 'user-a')).toBeNull()

  account.set(platformSnapshot('user-b', 2))
  expect(verifiedPlatformModelFrom(catalog, 'catalog-a', 'user-a')).toBeNull()
})

it.each([
  ['insufficient_balance', 'billing'],
  ['quota_exhausted', 'billing'],
  ['managed_credential_expired', 'auth'],
  ['unsupported_gateway', 'gateway']
] as const)('classifies stable managed %s failures as deterministic %s recovery', (code, layer) => {
  expect(platformErrorSurface(new PlatformSelectionError(code))).toEqual({ code, layer, retryable: false })
})

it('leaves non-managed failures on the existing generic recovery path', () => {
  expect(platformErrorSurface(new Error('unrelated BYOK error'))).toBeNull()
})
