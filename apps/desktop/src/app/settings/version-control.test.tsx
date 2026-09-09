import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type * as Nanostores from 'nanostores'
import { afterEach, describe, expect, it, vi } from 'vitest'

const stores = vi.hoisted(() => {
  const { atom } = require('nanostores') as typeof Nanostores

  return {
    apply: atom({ applying: false, stage: 'idle', message: '' }),
    connection: atom({ mode: 'local' }),
    status: atom({ branch: 'main', currentSha: '476a88d9bb', behind: 0, updateAvailable: false }),
    version: atom({ appVersion: '0.21.0' })
  }
})

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: {
      settings: { about: { versionUnavailable: 'Version unavailable' } },
      shell: {
        statusbar: {
          backendLabel: (value: string) => `backend v${value}`,
          backendVersion: (value: string) => `Backend v${value}`,
          branch: (value: string) => `branch ${value}`,
          clientLabel: (value: string) => `client v${value}`,
          commit: (value: string) => `commit ${value}`,
          commitsBehind: (count: number, branch: string) => `${count} commits behind ${branch}`,
          desktopVersion: (value: string) => `Hermes Desktop v${value}`,
          restart: 'restart',
          unknown: 'unknown',
          update: 'update',
          updateInProgress: 'Update in progress'
        }
      }
    }
  })
}))

vi.mock('@/lib/haptics', () => ({ triggerHaptic: vi.fn() }))
vi.mock('@/store/session', () => ({ $connection: stores.connection }))
vi.mock('@/store/updates', () => ({
  $desktopVersion: stores.version,
  $updateApply: stores.apply,
  $updateStatus: stores.status
}))

import { SettingsVersionControl } from './version-control'

afterEach(() => cleanup())

describe('SettingsVersionControl', () => {
  it('moves the client version and commit into the settings footer', () => {
    const onOpenAbout = vi.fn()

    render(<SettingsVersionControl onOpenAbout={onOpenAbout} />)

    const button = screen.getByRole('button', { name: 'v0.21.0' })
    expect(button.textContent).toContain('v0.21.0')
    expect(button.textContent).toContain('476a88d')

    fireEvent.click(button)
    expect(onOpenAbout).toHaveBeenCalledOnce()
  })
})
