import type { PaymentQuoteInput, PlatformBillingScope } from '../../../../shared/platform-contract'

export interface RechargeIntent extends PaymentQuoteInput {
  client_order_id: string
  order_id: string | null
}

interface IntentEnvironment {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  lock: <T>(name: string, task: () => Promise<T>) => Promise<T>
}

function unavailable(): never {
  throw Object.assign(new Error('payment_recovery_unavailable'), { code: 'payment_recovery_unavailable' })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createRechargeIntents(scope: PlatformBillingScope, environment?: IntentEnvironment) {
  const key = `aino:recharge:v1:${encodeURIComponent(scope.origin)}:${encodeURIComponent(scope.user_id)}`

  const storage = () => environment?.storage ?? window.localStorage

  const lock = <T>(task: () => Promise<T>): Promise<T> => {
    if (environment) {
      return environment.lock(key, task)
    }

    if (!navigator.locks) {
      return Promise.reject(
        Object.assign(new Error('payment_recovery_unavailable'), { code: 'payment_recovery_unavailable' })
      )
    }

    return navigator.locks.request(key, task)
  }

  // The generic UI storage helpers are best-effort; an uncertain payment must not
  // become a new UUID when storage fails. Only non-secret recovery identity lives here.
  const read = (): RechargeIntent | null => {
    try {
      const raw = storage().getItem(key)

      if (raw === null) {
        return null
      }

      const value: unknown = JSON.parse(raw)

      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return unavailable()
      }

      const data = value as Record<string, unknown>

      if (
        typeof data.client_order_id !== 'string' ||
        !UUID.test(data.client_order_id) ||
        typeof data.amount !== 'string' ||
        !/^\d{1,12}(\.\d{1,8})?$/.test(data.amount) ||
        (data.payment_type !== 'alipay' && data.payment_type !== 'wxpay') ||
        data.order_type !== 'balance' ||
        (data.order_id !== null && (typeof data.order_id !== 'string' || !/^\d{1,20}$/.test(data.order_id)))
      ) {
        return unavailable()
      }

      return {
        client_order_id: data.client_order_id,
        amount: data.amount,
        payment_type: data.payment_type,
        order_type: 'balance',
        order_id: data.order_id as string | null
      }
    } catch {
      return unavailable()
    }
  }

  const write = (value: RechargeIntent | null) => {
    try {
      if (value === null) {
        storage().removeItem(key)
      } else {
        storage().setItem(key, JSON.stringify(value))
      }
    } catch {
      unavailable()
    }
  }

  return {
    read: () => lock(async () => read()),
    begin: (input: PaymentQuoteInput) =>
      lock(async () => {
        const existing = read()

        if (existing) {
          return existing
        }

        const next: RechargeIntent = {
          amount: input.amount,
          payment_type: input.payment_type,
          order_type: 'balance',
          client_order_id: crypto.randomUUID(),
          order_id: null
        }

        write(next)

        return next
      }),
    rememberOrder: (clientOrderId: string, orderId: string) =>
      lock(async () => {
        const current = read()

        if (current?.client_order_id === clientOrderId) {
          write({ ...current, order_id: orderId })
        }
      }),
    finish: (clientOrderId: string) =>
      lock(async () => {
        if (read()?.client_order_id === clientOrderId) {
          write(null)
        }
      })
  }
}
