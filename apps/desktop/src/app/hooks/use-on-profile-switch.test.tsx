// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/store/profile', async () => {
  const { atom } = await import('nanostores')

  return { $activeGatewayProfile: atom('default') }
})

const { $activeGatewayProfile } = await import('@/store/profile')

import { useOnProfileSwitch } from './use-on-profile-switch'

function Harness({ onSwitch }: { onSwitch: () => void }) {
  useOnProfileSwitch(onSwitch)

  return null
}

afterEach(() => {
  cleanup()
  $activeGatewayProfile.set('default')
  vi.clearAllMocks()
})

describe('useOnProfileSwitch', () => {
  it('does not treat the StrictMode mount replay as a profile switch', () => {
    const onSwitch = vi.fn()

    render(
      <StrictMode>
        <Harness onSwitch={onSwitch} />
      </StrictMode>
    )

    expect(onSwitch).not.toHaveBeenCalled()

    act(() => {
      $activeGatewayProfile.set('research')
    })

    expect(onSwitch).toHaveBeenCalledOnce()
  })
})
