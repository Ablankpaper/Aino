import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import { stubResizeObserver } from '@/test/jsdom'

import { AccountLoginCard } from './account-login-card'

stubResizeObserver()

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderCard(requestCode = vi.fn().mockResolvedValue({ expires_in: 600, retry_after: 60 })) {
  return {
    requestCode,
    ...render(
      <I18nProvider configClient={null} initialLocale="zh">
        <AccountLoginCard developmentMode onRequestCode={requestCode} onVerifyCode={vi.fn()} />
      </I18nProvider>
    )
  }
}

describe('AccountLoginCard', () => {
  it('renders the identifier step with the Aino brand layout', () => {
    renderCard()

    expect(screen.getByText('AINO')).toBeTruthy()
    expect(screen.getByLabelText('邮箱或手机号')).toBeTruthy()
    expect(screen.getByRole('button', { name: '发送验证码' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '切换微信登录' })).toBeTruthy()
  })

  it('moves to the code step after requesting a code', async () => {
    const { requestCode } = renderCard()
    fireEvent.change(screen.getByLabelText('邮箱或手机号'), { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))

    expect(await screen.findByLabelText('验证码')).toBeTruthy()
    expect(requestCode).toHaveBeenCalledWith('user@example.com')
    expect(screen.getByPlaceholderText('输入验证码')).toBeTruthy()
    expect(screen.getByRole('button', { name: '返回' })).toBeTruthy()
  })

  it('shows the unavailable WeChat state without inventing a remote login', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: '切换微信登录' }))

    expect(screen.getByText('微信登录')).toBeTruthy()
    expect(screen.getByText('微信登录暂未在此开发版本开放。')).toBeTruthy()
    expect(screen.getByRole('button', { name: '切换邮箱 / 手机' })).toBeTruthy()
  })

  it('enables resend after the retry delay, while the original code is still valid', async () => {
    vi.useFakeTimers()
    renderCard()
    fireEvent.change(screen.getByLabelText('邮箱或手机号'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '发送验证码' })))
    await act(async () => vi.advanceTimersByTime(60_000))

    expect((screen.getByRole('button', { name: '重新发送' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByLabelText('验证码')).toBeTruthy()
  })

  it('stays on the identifier form when sending fails', async () => {
    renderCard(vi.fn().mockResolvedValue(null))
    fireEvent.change(screen.getByLabelText('邮箱或手机号'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '发送验证码' })))

    expect(screen.getByLabelText('邮箱或手机号')).toBeTruthy()
    expect(screen.queryByLabelText('验证码')).toBeNull()
  })
})
