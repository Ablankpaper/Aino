import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import { createAccountActions } from '@/store/account'
import { stubResizeObserver } from '@/test/jsdom'

import { AccountSettings } from '../settings/account-settings'

import { AccountFlow } from './account-gate'

stubResizeObserver()

afterEach(cleanup)

describe('standalone Aino account flow', () => {
  it('starts at login, opens account details after verification, and hides them on logout', async () => {
    const signedOut = { authenticated: false, account: null, mode: 'development', capabilities: { code_login: true } }
    const account = { id: 'test-account', identifier: 'test@example.com', display_name: 'Test' }

    const actions = createAccountActions(
      vi.fn(async (method: string) => {
        if (method === 'account.request_code') {
          return { ok: true, delivery: 'development', expires_in: 600, retry_after: 60 }
        }

        if (method === 'account.verify_code') {
          return { ...signedOut, authenticated: true, account }
        }

        return signedOut
      }) as never
    )

    render(
      <I18nProvider configClient={null} initialLocale="zh">
        <MemoryRouter>
          <AccountFlow actions={actions} connected>
            <AccountSettings />
          </AccountFlow>
        </MemoryRouter>
      </I18nProvider>
    )
    expect(screen.getByRole('main', { name: '登录 Aino' })).toBeTruthy()
    expect(screen.queryByText('我的账户')).toBeNull()
    fireEvent.change(screen.getByLabelText('邮箱或手机号'), { target: { value: account.identifier } })
    fireEvent.click(screen.getByRole('checkbox'))
    await screen.findByText('开发测试：验证码 1234，不会发送短信或邮件。')
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))
    fireEvent.change(await screen.findByLabelText('验证码'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText(account.id)).toBeTruthy()
    expect(screen.queryByLabelText('验证码')).toBeNull()
    expect(screen.queryByRole('button', { name: '发送验证码' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }))

    expect(await screen.findByLabelText('邮箱或手机号')).toBeTruthy()
    expect(screen.queryByText(account.id)).toBeNull()
  })
})
