import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import type { PlatformBillingBridge } from '../../../../shared/platform-contract'

import { BillingHistory } from './billing-history'

afterEach(cleanup)

it('opens an existing order by its id without creating another and keeps usage separate', async () => {
  const scope = { origin: 'https://fixture.example.test', user_id: '17', generation: 1 }
  const openOrder = vi.fn()
  const createOrder = vi.fn()

  const bridge = {
    scope: async () => scope,
    createOrder,
    listOrders: vi.fn().mockResolvedValue({
      items: [
        {
          order_id: '431',
          out_trade_no: 'original-merchant-order',
          status: 'RECHARGING',
          pay_amount: '20.00',
          payment_currency: 'CNY',
          created_at: new Date().toISOString()
        }
      ],
      page: 1,
      page_size: 20,
      total: 1
    }),
    listUsage: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'receipt',
          model: 'fixture-model',
          desktop_purpose: 'chat',
          actual_cost_decimal: '0.00000001',
          currency: 'USD',
          settlement_status: 'settled'
        }
      ],
      page: 1,
      page_size: 20,
      total: 1
    })
  } as unknown as PlatformBillingBridge

  render(
    <I18nProvider configClient={null} initialLocale="zh">
      <BillingHistory bridge={bridge} onOpenOrder={openOrder} scope={scope} />
    </I18nProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: '充值订单' }))
  fireEvent.click(await screen.findByRole('button', { name: /original-merchant-order/ }))
  expect(openOrder).toHaveBeenCalledWith('431')
  expect(createOrder).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '消费记录' }))
  expect(await screen.findByText('0.00000001 USD')).toBeTruthy()
  expect(screen.queryByText('original-merchant-order')).toBeNull()
})
