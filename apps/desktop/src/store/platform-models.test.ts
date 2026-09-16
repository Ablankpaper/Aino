import { atom } from 'nanostores'
import { expect, it, vi } from 'vitest'

import type { PlatformAccountSnapshot, PlatformModel } from '../../shared/platform-contract'
import { platformModel, platformSnapshot } from '../test/platform-model'

import {
  createPlatformModelCatalog,
  readPlatformDefault,
  requirePlatformSelection,
  writePlatformDefault
} from './platform-models'

it('scopes the fresh-chat default to the signed-in account', () => {
  writePlatformDefault('user-a', 'catalog-a')
  expect(readPlatformDefault('user-a')).toBe('catalog-a')
  expect(readPlatformDefault('user-b')).toBeNull()
  writePlatformDefault('user-a', null)
  expect(readPlatformDefault('user-a')).toBeNull()
})

it('completes an in-flight catalog load after an equivalent account snapshot refresh', async () => {
  const account = atom<PlatformAccountSnapshot | null>(platformSnapshot())
  let resolve!: (value: PlatformModel[]) => void

  const catalog = createPlatformModelCatalog(
    account,
    () =>
      new Promise(r => {
        resolve = r
      })
  )

  const loading = catalog.load()
  account.set(platformSnapshot())
  const refresh = catalog.load()
  resolve([platformModel()])
  await loading
  await refresh
  expect(catalog.state.get().phase).toBe('ready')
  expect(catalog.state.get().models.map(row => row.id)).toEqual(['catalog-a'])
})

it('does not expose an old catalog when account changes during a request', async () => {
  const account = atom<PlatformAccountSnapshot | null>(platformSnapshot())
  let resolve!: (value: PlatformModel[]) => void

  const catalog = createPlatformModelCatalog(
    account,
    () =>
      new Promise(r => {
        resolve = r
      })
  )

  const loading = catalog.load()
  account.set(platformSnapshot('user-b', 2))
  resolve([platformModel()])
  await loading
  expect(catalog.state.get().models).toEqual([])
  expect(catalog.state.get().phase).toBe('idle')
})

it('distinguishes errors from an empty catalog and refuses unavailable or foreign selections', async () => {
  const account = atom<PlatformAccountSnapshot | null>(platformSnapshot())
  const list = vi.fn().mockRejectedValueOnce({ code: 'network_error' }).mockResolvedValueOnce([])
  const catalog = createPlatformModelCatalog(account, list)
  await catalog.load()
  expect(catalog.state.get().phase).toBe('error')
  await catalog.load()
  expect(catalog.state.get().phase).toBe('ready')
  const model = platformModel()
  expect(requirePlatformSelection(account.get(), [model], model.id, 'user-a')).toEqual(model)
  expect(() => requirePlatformSelection(account.get(), [model], model.id, 'user-b')).toThrow()
  expect(() =>
    requirePlatformSelection(account.get(), [{ ...model, state: 'insufficient_balance' }], model.id, 'user-a')
  ).toThrow()
})
