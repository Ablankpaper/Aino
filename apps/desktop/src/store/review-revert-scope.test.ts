import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { $activeGatewayProfile } from './profile'
import { cancelRevert, confirmRevert, requestRevert } from './review'
import { $connection } from './session'

const revert = vi.fn(async () => undefined)
let previousConnection: ReturnType<typeof $connection.get>
let previousProfile: ReturnType<typeof $activeGatewayProfile.get>

beforeEach(() => {
  previousConnection = $connection.get()
  previousProfile = $activeGatewayProfile.get()
  $connection.set(null)
  $activeGatewayProfile.set('default')
  revert.mockClear()
  ;(window as unknown as { hermesDesktop: unknown }).hermesDesktop = { git: { review: { revert } } }
})

afterEach(() => {
  cancelRevert()
  $connection.set(previousConnection)
  $activeGatewayProfile.set(previousProfile)
  delete (window as unknown as { hermesDesktop?: unknown }).hermesDesktop
})

it.each(['connection', 'profile'] as const)(
  'does not apply an old revert confirmation to a different %s',
  async changed => {
    requestRevert('work.ts', '/selected-project')

    if (changed === 'connection') {
      $connection.set({
        baseUrl: 'http://127.0.0.1:1234',
        connectionId: 'another-connection',
        isFullscreen: false,
        logs: [],
        mode: 'local',
        nativeOverlayWidth: 0,
        token: '',
        windowButtonPosition: null,
        wsUrl: 'ws://127.0.0.1:1234/ws'
      })
    } else {
      $activeGatewayProfile.set('another-profile')
    }

    await expect(confirmRevert()).rejects.toThrow()
    expect(revert).not.toHaveBeenCalled()
  }
)
