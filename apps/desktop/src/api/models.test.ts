import { afterEach, expect, it, vi } from 'vitest'

import { setApiRequestConnection, setApiRequestProfile } from './client'
import { getGlobalModelInfo } from './models'

afterEach(() => {
  setApiRequestConnection(null)
  setApiRequestProfile(null)
  Reflect.deleteProperty(window, 'hermesDesktop')
  vi.restoreAllMocks()
})

it.each(['local', 'captured-remote'])(
  'reads the captured default owner %s despite a different active connection',
  async connectionId => {
    const api = vi.fn().mockResolvedValue({ model: 'owner-model', provider: 'owner-provider' })
    Object.defineProperty(window, 'hermesDesktop', { configurable: true, value: { api } })
    setApiRequestConnection('other-remote')
    setApiRequestProfile('other-profile')

    await expect(getGlobalModelInfo({ connectionId, profile: 'owner-profile' })).resolves.toEqual({
      model: 'owner-model',
      provider: 'owner-provider'
    })
    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId,
        profile: 'owner-profile',
        path: '/api/model/info'
      })
    )
  }
)
