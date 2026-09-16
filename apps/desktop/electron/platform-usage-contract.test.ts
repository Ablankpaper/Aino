import { expect, it } from 'vitest'

import { parsePlatformUsagePage, parsePlatformUsageQuery } from './platform-usage-contract'

it('accepts only bounded usage filters, never caller-selected users or credentials', () => {
  expect(parsePlatformUsageQuery({ page: 1, page_size: 50, user_id: 'other', token: 'ignored' })).toEqual({ page: 1, page_size: 50 })

  for (const input of [{ page: 0, page_size: 50 }, { page: 1, page_size: 101 }, { page: 1, page_size: 50, desktop_turn_id: 'a\nb' }]) {
    expect(() => parsePlatformUsageQuery(input)).toThrow()
  }
})

it('requires authoritative decimal receipts and rejects contradictory not-charged amounts', () => {
  const row = { id: 1, request_id: 'r', model: 'fixture', currency: 'USD', actual_cost_decimal: '0.00000001',
    settlement_status: 'settled', created_at: '2026-09-16T00:00:00Z', api_key: { key: 'not-for-renderer' } }

  const page = (item = row) => ({ items: [item], total: 1, page: 1, page_size: 50 })
  expect(parsePlatformUsagePage(page()).items[0]).not.toHaveProperty('api_key')
  expect(parsePlatformUsagePage(page({ ...row, settlement_status: 'unknown' })).items[0].actual_cost_decimal).toBeNull()
  expect(() => parsePlatformUsagePage(page({ ...row, settlement_status: 'not_charged' }))).toThrow()
  expect(parsePlatformUsagePage(page({ ...row, settlement_status: 'not_charged', actual_cost_decimal: '0' })).items[0].actual_cost_decimal).toBe('0')
  expect(() => parsePlatformUsagePage(page({ ...row, actual_cost_decimal: '1e2' }))).toThrow()
})
