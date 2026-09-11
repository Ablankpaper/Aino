import { JsonRpcGatewayError } from '@hermes/shared'
import { describe, expect, it, vi } from 'vitest'

import { createAccountActions } from './account'

describe('account actions', () => {
  it('loads status and exposes the authenticated account', async () => {
    const request = vi.fn().mockResolvedValue({
      authenticated: true,
      account: { id: 'abc', identifier: 'user@example.com', display_name: 'Aino User' },
      mode: 'development'
    })

    const actions = createAccountActions(request)

    await actions.refresh()

    expect(request).toHaveBeenCalledWith('account.status')
    expect(actions.state.get()).toMatchObject({
      authenticated: true,
      account: { id: 'abc' },
      mode: 'development',
      error: null
    })
  })

  it('runs the development code flow without storing credentials in the renderer', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, delivery: 'development', expires_in: 600 })
      .mockResolvedValueOnce({
        authenticated: true,
        created: true,
        account: { id: 'abc', identifier: '13800138000', display_name: '13800138000' }
      })

    const actions = createAccountActions(request)

    await actions.requestCode('13800138000')
    const result = await actions.verifyCode('13800138000', '1234')

    expect(result?.authenticated).toBe(true)
    expect(request).toHaveBeenNthCalledWith(1, 'account.request_code', { identifier: '13800138000' })
    expect(request).toHaveBeenNthCalledWith(2, 'account.verify_code', {
      identifier: '13800138000',
      code: '1234'
    })
    expect(actions.state.get().account?.identifier).toBe('13800138000')
  })

  it('surfaces request errors and clears them after a successful refresh', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        new JsonRpcGatewayError('invalid code', {
          data: { reason: 'invalid_code' }
        })
      )
      .mockResolvedValueOnce({
        authenticated: false,
        account: null
      })

    const actions = createAccountActions(request)

    expect(await actions.verifyCode('user@example.com', '0000')).toBeNull()
    expect(actions.state.get().error?.reason).toBe('invalid_code')
    await actions.refresh()
    expect(actions.state.get().error).toBeNull()
  })

  it('does not let a slow status refresh undo a newer successful login', async () => {
    let finishStatus!: (value: unknown) => void

    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishStatus = resolve
          })
      )
      .mockResolvedValueOnce({
        authenticated: true,
        account: { id: 'current', identifier: 'test@example.com', display_name: 'Test' },
        mode: 'development'
      })

    const actions = createAccountActions(request)
    const pending = actions.refresh()
    await actions.verifyCode('test@example.com', '1234')
    finishStatus({ authenticated: false, account: null, mode: 'development' })
    await pending

    expect(actions.state.get().account?.id).toBe('current')
  })

  it('keeps state isolated from another account connection', async () => {
    const first = createAccountActions(
      vi.fn().mockResolvedValue({
        authenticated: true,
        account: { id: 'one', identifier: 'one@example.com', display_name: 'One' }
      })
    )

    const second = createAccountActions(vi.fn().mockResolvedValue({ authenticated: false, account: null }))
    await first.refresh()
    await second.refresh()

    expect(first.state.get().account?.id).toBe('one')
    expect(second.state.get().account).toBeNull()
  })
})
