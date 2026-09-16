import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'
import { useEffect, useState } from 'react'

import { platformAccountActions } from '@/api/platform'
import { reconcileTurnUsage, type TurnCost } from '@/lib/platform-usage-reconciliation'
import type { TurnBilling } from '@/lib/turn-billing'

import type { PlatformAccountSnapshot, PlatformUsageRow } from '../../../../shared/platform-contract'

const unavailable = atom<PlatformAccountSnapshot | null>(null)
const DELAYS = [2000, 5000, 10000, 20000, 30000]
const pending: TurnCost = { status: 'pending', amount: null }

interface CostResult {
  key: string
  cost: TurnCost
  exhausted: boolean
  rows: PlatformUsageRow[]
  truncated: boolean
}

const emptyResult: CostResult = { key: '', cost: pending, exhausted: false, rows: [], truncated: false }

export function useTurnCost(billing: TurnBilling) {
  const desktop = window.hermesDesktop

  const snapshot = useStore(
    desktop?.platformAccount ? platformAccountActions(desktop.platformAccount).snapshot : unavailable
  )

  const bridge = desktop?.platformBilling
  const owner = snapshot?.account?.id

  const needsLogin =
    owner !== billing.user_id || snapshot?.phase === 'signed_out' || snapshot?.phase === 'reauth_required'

  const available = (snapshot?.phase === 'signed_in' || snapshot?.phase === 'offline') && !needsLogin && Boolean(bridge)
  const [retry, setRetry] = useState(0)
  const receipt = JSON.stringify(billing)
  const key = `${snapshot?.mode}:${owner}:${available}:${receipt}:${retry}`
  const [result, setResult] = useState<CostResult>(emptyResult)

  useEffect(() => {
    if (!available || !bridge) {
      return
    }

    // Equivalent metadata objects must not restart polling or reset its budget.
    const billing: TurnBilling = JSON.parse(receipt)
    let alive = true
    let inflight = false
    let attempts = 0
    let done = false
    let blocked = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastCost = pending
    let lastRows: PlatformUsageRow[] = []
    let truncated = false

    const run = async () => {
      if (!alive || inflight || done || document.visibilityState === 'hidden') {
        return
      }

      inflight = true
      attempts += 1

      try {
        const rows: PlatformUsageRow[] = []
        let allPages = false

        for (let page = 1; page <= 4 && alive; page += 1) {
          const result = await bridge.listUsage({
            expected_user_id: billing.user_id,
            page,
            page_size: 50,
            session_id: billing.session_id,
            desktop_turn_id: billing.turn_id
          })

          rows.push(...result.items)

          if (result.items.length < 50) {
            allPages = true

            break
          }
        }

        lastCost = reconcileTurnUsage(billing, rows, allPages)
        lastRows = [
          ...new Map(
            rows
              .filter(row => row.session_id === billing.session_id && row.desktop_turn_id === billing.turn_id)
              .map(row => [row.id, row])
          ).values()
        ]
        truncated = !allPages
        done = lastCost.status === 'settled'
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : ''

        if (['not_authenticated', 'platform_account_changed', 'auth_attempt_superseded'].includes(String(code))) {
          blocked = true
          done = true
          lastCost = pending
          lastRows = []
        }
      } finally {
        inflight = false

        if (alive) {
          const exhausted = blocked || (!done && attempts > DELAYS.length)
          setResult({ key, cost: lastCost, exhausted, rows: lastRows, truncated })

          if (!done && !exhausted) {
            timer = setTimeout(() => void run(), DELAYS[attempts - 1])
          }

          if (exhausted) {
            done = true
          }
        }
      }
    }

    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(timer)

        return
      }

      clearTimeout(timer)
      void run()
    }

    void run()
    document.addEventListener('visibilitychange', visibility)

    return () => {
      alive = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [available, bridge, key, receipt])

  return {
    ...(available && result.key === key ? result : emptyResult),
    available,
    needsLogin,
    retry: () => setRetry(value => value + 1)
  }
}
