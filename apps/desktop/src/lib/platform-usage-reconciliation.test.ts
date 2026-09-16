import { describe, expect, it } from 'vitest'

import type { PlatformUsageRow } from '../../shared/platform-contract'

import { reconcileTurnUsage } from './platform-usage-reconciliation'
import type { TurnBilling } from './turn-billing'

describe('authoritative turn fees', () => {
  it('settles only matching calls with actual ledger receipts and sums decimals exactly', () => {
    const calls = [crypto.randomUUID(), crypto.randomUUID()]

    const billing: TurnBilling = {
      source: 'aino',
      user_id: '17',
      session_id: crypto.randomUUID(),
      turn_id: crypto.randomUUID(),
      status: 'pending',
      calls_complete: true,
      revision: 3,
      calls: calls.map(call_id => ({ call_id, purpose: 'chat' }))
    }

    const rows: PlatformUsageRow[] = calls.map((desktop_call_id, index) => ({
      id: String(index + 1),
      request_id: String(index + 1),
      model: 'fixture',
      session_id: billing.session_id,
      desktop_turn_id: billing.turn_id,
      desktop_call_id,
      desktop_purpose: 'chat',
      actual_cost_decimal: index === 0 ? '999999.10000001' : '0.20000002',
      currency: 'USD',
      settlement_status: 'settled',
      created_at: ''
    }))

    expect(reconcileTurnUsage(billing, rows, true)).toEqual({ status: 'settled', amount: '999999.30000003' })
    expect(reconcileTurnUsage(billing, [...rows, rows[0]], true).amount).toBe('999999.30000003')
    expect(reconcileTurnUsage(billing, rows.slice(0, 1), true).status).toBe('partial')
    expect(reconcileTurnUsage(billing, rows, false).status).toBe('partial')
    expect(reconcileTurnUsage({ ...billing, calls_complete: false }, rows, true).status).toBe('partial')
    expect(reconcileTurnUsage(billing, [{ ...rows[0], desktop_turn_id: crypto.randomUUID() }], true)).toEqual({
      status: 'pending',
      amount: null
    })
    expect(
      reconcileTurnUsage(
        billing,
        rows.map(row => ({ ...row, settlement_status: 'unknown', actual_cost_decimal: '0' })),
        true
      )
    ).toEqual({ status: 'pending', amount: null })
  })
})
