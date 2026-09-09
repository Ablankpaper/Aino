import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProfileCreateDialogHost } from './create-profile-dialog-host'

const { createRequest, profiles, refreshActiveProfile, selectProfile } = vi.hoisted(() => ({
  createRequest: require('nanostores').atom(0),
  profiles: require('nanostores').atom([{ is_default: true, name: 'default' }]),
  refreshActiveProfile: vi.fn(async () => undefined),
  selectProfile: vi.fn()
}))

vi.mock('@/store/profile', () => ({
  $profileCreateRequest: createRequest,
  $profiles: profiles,
  refreshActiveProfile,
  selectProfile
}))

vi.mock('./create-profile-dialog', () => ({
  CreateProfileDialog: ({
    onCreated,
    open,
    profiles
  }: {
    onCreated?: (name: string) => void
    open: boolean
    profiles: Array<{ name: string }>
  }) =>
    open ? (
      <button
        aria-label="create dialog"
        data-profile-count={profiles.length}
        onClick={() => onCreated?.('new-profile')}
        type="button"
      >
        Create
      </button>
    ) : null
}))

afterEach(() => {
  cleanup()
  createRequest.set(0)
  profiles.set([{ is_default: true, name: 'default' }])
  refreshActiveProfile.mockClear()
  selectProfile.mockClear()
})

describe('ProfileCreateDialogHost', () => {
  it('opens from the global profile-create request while the chat surface is mounted', async () => {
    render(<ProfileCreateDialogHost />)

    expect(screen.queryByRole('button', { name: 'create dialog' })).toBeNull()

    await act(async () => {
      createRequest.set(1)
    })

    expect(screen.getByRole('button', { name: 'create dialog' }).getAttribute('data-profile-count')).toBe('1')
  })

  it('refreshes and selects the created profile', async () => {
    render(<ProfileCreateDialogHost />)

    await act(async () => {
      createRequest.set(1)
    })
    await act(async () => {
      screen.getByRole('button', { name: 'create dialog' }).click()
    })

    expect(refreshActiveProfile).toHaveBeenCalledTimes(1)
    expect(selectProfile).toHaveBeenCalledWith('new-profile')
  })
})
