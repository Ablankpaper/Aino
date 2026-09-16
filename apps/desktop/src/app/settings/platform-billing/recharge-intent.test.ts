import { beforeEach, expect, it } from 'vitest'

import { createRechargeIntents } from './recharge-intent'

beforeEach(() => localStorage.clear())

it('reuses one persisted intention across windows and restarts without storing checkout material', async () => {
  let tail = Promise.resolve()

  const lock = <T>(name: string, task: () => Promise<T>): Promise<T> => {
    const next = tail.then(task)
    tail = next.then(
      () => undefined,
      () => undefined
    )

    return next
  }

  const scope = { origin: 'https://platform.example.test', user_id: '17', generation: 1 }
  const first = createRechargeIntents(scope, { storage: localStorage, lock })
  const second = createRechargeIntents(scope, { storage: localStorage, lock })
  const input = { amount: '20.00', payment_type: 'alipay' as const, order_type: 'balance' as const }
  const [one, two] = await Promise.all([first.begin(input), second.begin(input)])
  expect(one.client_order_id).toBe(two.client_order_id)
  await first.rememberOrder(one.client_order_id, '431')
  const restored = await createRechargeIntents(scope, { storage: localStorage, lock }).read()
  expect(restored).toMatchObject({ client_order_id: one.client_order_id, order_id: '431', amount: '20.00' })
  expect(Object.keys(restored!).sort()).toEqual(['amount', 'client_order_id', 'order_id', 'order_type', 'payment_type'])
  const differentAccount = createRechargeIntents({ ...scope, user_id: '18' }, { storage: localStorage, lock })
  expect(await differentAccount.read()).toBeNull()
})

it('fails closed on unavailable or corrupt persistence instead of replacing an unknown order', async () => {
  const lock = async <T>(name: string, task: () => Promise<T>) => task()
  const scope = { origin: 'https://platform.example.test', user_id: '17', generation: 1 }
  const store = createRechargeIntents(scope, { storage: localStorage, lock })
  const input = { amount: '20', payment_type: 'wxpay' as const, order_type: 'balance' as const }
  const original = await store.begin(input)
  expect(await store.begin({ ...input, amount: '50' })).toEqual(original)
  localStorage.setItem(localStorage.key(0)!, '{invalid')
  await expect(store.begin(input)).rejects.toMatchObject({ code: 'payment_recovery_unavailable' })

  const broken = createRechargeIntents(scope, {
    storage: {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {}
    },
    lock
  })

  await expect(broken.begin(input)).rejects.toMatchObject({ code: 'payment_recovery_unavailable' })
})
