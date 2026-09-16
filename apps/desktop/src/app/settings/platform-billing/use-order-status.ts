import { type RefObject, useEffect } from 'react'

import type { PlatformOrder } from '../../../../shared/platform-contract'

export interface OrderRefresh {
  order: PlatformOrder
  credited: boolean
  error: string | null
}

export const POLLING_ORDERS = new Set(['PENDING', 'PAID', 'RECHARGING'])

export function paymentErrorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'network_error'
}

interface OrderStatusOptions {
  enabled: boolean
  order: PlatformOrder | null
  credited: boolean
  retry: number
  operation: RefObject<number>
  read: (orderId: string) => Promise<OrderRefresh>
  apply: (value: Partial<OrderRefresh>) => void
}

export function useOrderStatus({ enabled, order, credited, retry, operation, read, apply }: OrderStatusOptions) {
  const orderId = order?.order_id
  const status = order?.status
  const expires = order?.expires_at

  useEffect(() => {
    if (!enabled || !orderId || (!POLLING_ORDERS.has(status ?? '') && (status !== 'COMPLETED' || credited))) {
      return
    }

    let alive = true
    let running = false
    let failures = 0
    let attempts = 0
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const refresh = async () => {
      if (!alive || running || stopped || document.visibilityState === 'hidden') {
        return
      }

      running = true
      attempts += 1
      const version = operation.current

      try {
        const next = await read(orderId)

        if (!alive || version !== operation.current) {
          return
        }

        apply(next)
        failures = next.error ? failures + 1 : 0
        stopped =
          (!POLLING_ORDERS.has(next.order.status) && !(next.order.status === 'COMPLETED' && !next.credited)) ||
          (next.order.status === 'PENDING' && Date.parse(next.order.expires_at) <= Date.now())
      } catch (error) {
        if (!alive || version !== operation.current) {
          return
        }

        failures += 1
        const code = paymentErrorCode(error)
        apply({ error: code })
        stopped = ['platform_account_changed', 'not_authenticated', 'auth_attempt_superseded'].includes(code)
      } finally {
        running = false
        stopped ||= failures >= 6 || attempts >= 100

        if (alive && version === operation.current && !stopped) {
          timer = setTimeout(() => void refresh(), Math.min(30000, 3000 * 2 ** failures))
        }
      }
    }

    const visibility = () => {
      clearTimeout(timer)

      if (document.visibilityState !== 'hidden') {
        void refresh()
      }
    }

    void refresh()
    document.addEventListener('visibilitychange', visibility)

    return () => {
      alive = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [apply, credited, enabled, expires, operation, orderId, read, retry, status])
}
