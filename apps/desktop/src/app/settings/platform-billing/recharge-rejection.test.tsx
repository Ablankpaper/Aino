import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import type { PaymentQuoteInput, PlatformBillingBridge, PlatformOrder } from '../../../../shared/platform-contract'

import { RechargeView } from './recharge-view'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

function fixture() {
  let tail = Promise.resolve()
  vi.stubGlobal('navigator', {
    ...navigator,
    locks: {
      request: (_: string, task: () => Promise<unknown>) => {
        const next = tail.then(task)
        tail = next.then(
          () => undefined,
          () => undefined
        )

        return next
      }
    }
  })
  const scope = { origin: 'https://fixture.example.test', user_id: '17', generation: 1 }

  const order: PlatformOrder = {
    order_id: '431',
    client_order_id: null,
    out_trade_no: 'recovered-merchant-order',
    status: 'RECHARGING',
    payment_type: 'alipay',
    requested_amount: '10',
    pay_amount: '10',
    payment_currency: 'CNY',
    credit_amount: '10',
    credit_currency: 'USD',
    fee_amount: '0',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 900000).toISOString(),
    can_cancel: false,
    confirmation_required: false,
    payment_unknown: false,
    checkout: null
  }

  const quote = vi.fn(async (input: PaymentQuoteInput) => ({
    requested_amount: input.amount,
    pay_amount: input.amount,
    credit_amount: input.amount,
    payment_currency: 'CNY',
    credit_currency: 'USD' as const,
    fee_amount: '0'
  }))

  const createOrder = vi.fn<PlatformBillingBridge['createOrder']>()

  const bridge = {
    scope: async () => scope,
    checkoutInfo: async () => ({
      payment_enabled: true,
      balance_disabled: false,
      help_text: '',
      methods: [
        { id: 'alipay', display_name: 'Alipay', currency: 'CNY', min_amount: '1', max_amount: '50', available: true }
      ]
    }),
    quote,
    createOrder,
    getOrder: async () => order
  } as unknown as PlatformBillingBridge

  const mount = () =>
    render(
      <I18nProvider configClient={null} initialLocale="en">
        <RechargeView bridge={bridge} onOpenChange={() => {}} open scope={scope} />
      </I18nProvider>
    )

  const submit = async (amount: string) => {
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: amount } })
    fireEvent.click(screen.getByRole('button', { name: 'Get quote' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm order' }))
  }

  return { mount, submit, createOrder, quote, order }
}

const failure = (code: string) => Object.assign(new Error(code), { code })

it('corrects a rejected create after restart and retains the corrected request through an unknown result', async () => {
  const f = fixture()
  f.createOrder
    .mockRejectedValueOnce(failure('INVALID_AMOUNT'))
    .mockRejectedValueOnce(failure('network_error'))
    .mockResolvedValue(f.order)
  const first = f.mount()
  await f.submit('20')
  await screen.findByRole('alert')
  expect(screen.getByRole('textbox')).toBeTruthy()
  first.unmount()
  const reopened = f.mount()
  await screen.findByRole('textbox')
  expect(f.createOrder).toHaveBeenCalledTimes(1)
  await f.submit('10')
  await screen.findByRole('alert')
  expect(screen.queryByRole('textbox')).toBeNull()
  reopened.unmount()
  f.mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Recover original order' }))
  await screen.findByText(f.order.out_trade_no)
  const requests = f.createOrder.mock.calls.map(([input]) => input)
  expect(requests.map(input => input.amount)).toEqual(['20', '10', '10'])
  expect(new Set(requests.map(input => input.client_order_id)).size).toBe(1)
  expect(requests[1].expected_quote?.requested_amount).toBe('10')
  expect(f.quote).toHaveBeenCalledTimes(2)
})

it('keeps a competing unknown create recoverable when a correction conflicts with its existing order', async () => {
  const f = fixture()
  let release!: (order: PlatformOrder) => void
  let rejectStale!: (error: Error) => void
  f.createOrder
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    .mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectStale = reject
        })
    )
    .mockRejectedValueOnce(failure('INVALID_AMOUNT'))
    .mockRejectedValueOnce(failure('IDEMPOTENCY_KEY_CONFLICT'))
  const firstWindow = f.mount()
  await f.submit('20')
  await waitFor(() => expect(f.createOrder).toHaveBeenCalledTimes(1))
  firstWindow.unmount()
  const staleWindow = f.mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Recover original order' }))
  await waitFor(() => expect(f.createOrder).toHaveBeenCalledTimes(2))
  staleWindow.unmount()
  const secondWindow = f.mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Recover original order' }))
  await screen.findByRole('alert')
  await f.submit('10')
  expect((await screen.findByRole('alert')).textContent).toContain('order history')
  expect(screen.queryByRole('textbox')).toBeNull()
  await act(async () => rejectStale(failure('INVALID_AMOUNT')))
  secondWindow.unmount()
  const restored = f.mount()
  await screen.findByRole('button', { name: 'Recover original order' })
  expect(screen.queryByRole('textbox')).toBeNull()
  await act(async () => release(f.order))
  restored.unmount()
  f.mount()
  await screen.findByText(f.order.out_trade_no)
  const requests = f.createOrder.mock.calls.map(([input]) => input)
  expect(requests.map(input => input.amount)).toEqual(['20', '20', '20', '10'])
  expect(new Set(requests.map(input => input.client_order_id)).size).toBe(1)
})
