import type { PlatformUsageRow } from '../../shared/platform-contract'

import type { TurnBilling } from './turn-billing'

export interface TurnCost {
  status: 'pending' | 'partial' | 'settled'
  amount: string | null
}

function units(value: string | null): bigint | null {
  if (value === null || !/^\d{1,12}(\.\d{1,8})?$/.test(value)) {
    return null
  }

  const [whole, fraction = ''] = value.split('.')

  return BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'))
}

export function reconcileTurnUsage(billing: TurnBilling, rows: PlatformUsageRow[], allPages: boolean): TurnCost {
  let sum = 0n
  let known = 0
  let uncertain = !billing.calls_complete || !allPages
  const expected = new Set(billing.calls.map(call => call.call_id))
  const observed = new Set<string>()
  const seen = new Map<string, PlatformUsageRow>()
  const rowsByCall = new Map<string, PlatformUsageRow[]>()

  for (const row of rows) {
    if (row.session_id !== billing.session_id || row.desktop_turn_id !== billing.turn_id || !row.desktop_call_id) {
      continue
    }

    const previous = seen.get(row.id)

    if (previous) {
      if (
        previous.actual_cost_decimal !== row.actual_cost_decimal ||
        previous.settlement_status !== row.settlement_status
      ) {
        uncertain = true
      }

      continue
    }

    seen.set(row.id, row)
    observed.add(row.desktop_call_id)
    const callRows = rowsByCall.get(row.desktop_call_id) ?? []
    callRows.push(row)
    rowsByCall.set(row.desktop_call_id, callRows)

    if (!expected.has(row.desktop_call_id)) {
      uncertain = true
    }
  }

  for (const callRows of rowsByCall.values()) {
    if (callRows.length !== 1) {
      uncertain = true

      continue
    }

    const [row] = callRows

    const amount = units(row.actual_cost_decimal)

    if (
      row.currency !== 'USD' ||
      amount === null ||
      (row.settlement_status !== 'settled' && row.settlement_status !== 'not_charged') ||
      (row.settlement_status === 'not_charged' && amount !== 0n)
    ) {
      uncertain = true

      continue
    }

    known += 1
    sum += amount
  }

  if (!known) {
    return { status: 'pending', amount: null }
  }

  if (!expected.size || [...expected].some(call => !observed.has(call))) {
    uncertain = true
  }

  return {
    status: uncertain ? 'partial' : 'settled',
    amount: `${sum / 100000000n}.${String(sum % 100000000n).padStart(8, '0')}`
  }
}
