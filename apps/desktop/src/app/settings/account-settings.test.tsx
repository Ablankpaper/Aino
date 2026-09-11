import { JsonRpcGatewayError } from '@hermes/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AccountContext } from '@/app/account/account-context'
import { SidebarIdentityFooter } from '@/app/chat/sidebar/section-states'
import { I18nProvider } from '@/i18n'
import { createAccountActions } from '@/store/account'

import { AccountSettings } from './account-settings'

const original = { id: 'account-one', identifier: 'user@example.test', display_name: 'Original' }

function renderAccount(request = vi.fn()) {
  const actions = createAccountActions(request)
  actions.state.set({ ...actions.state.get(), authenticated: true, account: original, ready: true })
  render(
    <I18nProvider configClient={null} initialLocale="en">
      <AccountContext.Provider value={actions}>
        <AccountSettings />
        <SidebarIdentityFooter onOpenAccount={() => {}} onOpenSettings={() => {}} settingsLabel="Settings" />
      </AccountContext.Provider>
    </I18nProvider>
  )

  return actions
}

afterEach(cleanup)

describe('account nickname editing', () => {
  it('saves the nickname and updates the sidebar from the returned account', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ authenticated: true, account: { ...original, display_name: '小海盗 🏴‍☠️' } })

    renderAccount(request)

    fireEvent.click(screen.getByRole('button', { name: 'Edit nickname' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nickname' }), { target: { value: '  小海盗 🏴‍☠️  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'My account · 小海盗 🏴‍☠️' })).toBeTruthy())
    expect(screen.getByText('小🏴')).toBeTruthy()
    expect(request).toHaveBeenCalledWith('account.update_profile', { display_name: '小海盗 🏴‍☠️' })
    expect(screen.queryByRole('textbox', { name: 'Nickname' })).toBeNull()
  })

  it('keeps the saved identity on cancel or failure and allows retrying the draft', async () => {
    const request = vi
      .fn()
      .mockRejectedValue(new JsonRpcGatewayError('write failed', { data: { reason: 'state_unavailable' } }))

    const actions = renderAccount(request)

    fireEvent.click(screen.getByRole('button', { name: 'Edit nickname' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nickname' }), { target: { value: 'Discard me' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(request).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Edit nickname' }))
    expect((screen.getByRole('textbox', { name: 'Nickname' }) as HTMLInputElement).value).toBe('Original')
    fireEvent.change(screen.getByRole('textbox', { name: 'Nickname' }), { target: { value: 'Keep my draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alert')
    expect((screen.getByRole('textbox', { name: 'Nickname' }) as HTMLInputElement).value).toBe('Keep my draft')
    expect(actions.state.get().account).toEqual(original)
    expect(screen.getByRole('button', { name: 'My account · Original' })).toBeTruthy()
  })
})
