import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $desktopBoot } from '@/store/boot'
import { $gatewaySwitching } from '@/store/gateway-switch'
import { setGatewayState } from '@/store/session'
import type * as WindowsModule from '@/store/windows'

const { hudWindowMock } = vi.hoisted(() => ({ hudWindowMock: vi.fn(() => true) }))

vi.mock('@/store/windows', async importOriginal => {
  const actual = await importOriginal<typeof WindowsModule>()

  return {
    ...actual,
    isHudWindow: () => hudWindowMock()
  }
})

import { GatewayConnectingOverlay } from './gateway-connecting-overlay'

beforeEach(() => {
  hudWindowMock.mockReturnValue(true)
  $desktopBoot.set({
    ...$desktopBoot.get(),
    error: null,
    message: 'starting',
    phase: 'renderer.init',
    progress: 2,
    running: true,
    visible: true
  })
  $gatewaySwitching.set(false)
  setGatewayState('connecting')
})

afterEach(() => cleanup())

describe('GatewayConnectingOverlay in HUD mode', () => {
  it('keeps the floating composer visible while its gateway is starting', () => {
    render(<GatewayConnectingOverlay />)

    expect(document.querySelector('[data-glass-opaque]')).toBeNull()
  })

  it('keeps a stable hook order when the window kind changes during a reload', () => {
    hudWindowMock.mockReturnValue(false)
    const view = render(<GatewayConnectingOverlay />)

    hudWindowMock.mockReturnValue(true)

    expect(() => view.rerender(<GatewayConnectingOverlay />)).not.toThrow()
    expect(document.querySelector('[data-glass-opaque]')).toBeNull()
  })
})
