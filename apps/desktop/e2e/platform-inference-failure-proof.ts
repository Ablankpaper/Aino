import { consumption, type EdgeContext, type NativeFaultState, sendPrompt, sendToolTurn } from './platform-account-edge-proof'
import { type NativeState } from './platform-real-api'
import { expect, type Page } from './test'

interface FailureFaults extends NativeFaultState {
  provider_attempts: number
  authenticated_inference_attempts: number
  inference_attempt_unix_millis: number[]
  inference_http_fault_responses: number
  inference_429s: number
  inference_503s: number
}

interface FailureWindow {
  inferenceAlerts: Array<{ expected: boolean; message: string }>
}

export async function observeInferenceAlerts(page: Page) {
  await page.evaluate(() => {
    const target = window as unknown as FailureWindow
    target.inferenceAlerts = []

    const allowed = new Set([
      'Aino balance or subscription quota is unavailable. Check your account or select another model.',
      'HTTP 429: Upstream rate limit exceeded, please retry later',
      'HTTP 502: Upstream service temporarily unavailable'
    ])

    const scan = () => {
      for (const alert of document.querySelectorAll('[role="alert"]')) {
        const message = alert.querySelector(':scope > div:first-child > div > .min-w-0')?.textContent?.trim() ?? ''
        const text = alert.textContent?.trim() ?? ''

        if (text && !target.inferenceAlerts.some(entry => entry.message === text)) {
          target.inferenceAlerts.push({ expected: allowed.has(message), message: text })
        }
      }
    }

    scan()
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, characterData: true })
  })
}

async function settled(page: Page) {
  await expect(page.locator('[contenteditable="true"]').first().locator('xpath=ancestor::form')
    .getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0, { timeout: 45_000 })
}

async function recoveredTurn(page: Page, api: EdgeContext['api'], before: NativeState) {
  await expect.poll(async () => (await api.control<NativeState>('state')).usage_calls, { timeout: 60_000 })
    .toBe(before.usage_calls + 2)
  await settled(page)
  const after = await api.control<NativeState>('state')
  expect(after.model_calls - before.model_calls).toBe(2)
  expect(after.tool_results - before.tool_results).toBe(1)
  expect(after.orders).toBe(before.orders)
  expect(after.payment_calls).toBe(before.payment_calls)
  expect(Number(before.balance) - Number(after.balance)).toBeCloseTo(Number(after.usage_cost) - Number(before.usage_cost), 8)
  await expect(page.getByText(`Verified ${api.info.fixture_content}`, { exact: false }).last()).toBeVisible()

  return after
}

function completeConsumption(value: NativeState) {
  return { ...consumption(value), usage_cost: value.usage_cost, orders: value.orders, payment_calls: value.payment_calls }
}

export async function verifyInferenceFailures({ launched, api }: EdgeContext) {
  const { page } = launched
  const initial = await sendToolTurn(page, api)
  const transientProof = []

  for (const status of [429, 503] as const) {
    const before = await api.control<NativeState>('state')
    const faultsBefore = await api.control<FailureFaults>('faults')
    await api.control('faults', JSON.stringify({ inference_http_status: status, inference_http_failures: 8,
      inference_retry_after_seconds: status === 429 ? 2 : 0 }))
    await sendPrompt(page, `Read the same fixture file while checking HTTP ${status} recovery.`)
    const expectedMessage = status === 429 ? 'HTTP 429: Upstream rate limit exceeded, please retry later' : 'HTTP 502: Upstream service temporarily unavailable'
    await expect(page.getByText(expectedMessage, { exact: true }).last()).toBeVisible({ timeout: 60_000 })
    await settled(page)
    const failed = await api.control<FailureFaults>('faults')
    const attempts = failed.authenticated_inference_attempts - faultsBefore.authenticated_inference_attempts
    expect(attempts).toBeGreaterThan(1)
    expect(attempts).toBeLessThanOrEqual(3)
    expect(failed.provider_attempts - faultsBefore.provider_attempts).toBe(attempts)
    expect(failed.inference_http_fault_responses - faultsBefore.inference_http_fault_responses).toBe(attempts)
    expect(completeConsumption(await api.control<NativeState>('state'))).toEqual(completeConsumption(before))
    const times = failed.inference_attempt_unix_millis.slice(-attempts)
    const intervals = times.slice(1).map((time, index) => time - times[index])

    if (status === 429) {
      expect(intervals.every(interval => interval >= 2000)).toBe(true)
    }

    const retry = page.locator('button.aui-error-action').filter({ hasText: /^Retry$/ }).last()
    await expect(retry).toBeVisible()
    await api.control('faults', JSON.stringify({ inference_http_status: 0, inference_http_failures: 0, inference_retry_after_seconds: 0 }))
    expect(completeConsumption(await api.control<NativeState>('state'))).toEqual(completeConsumption(before))
    await retry.click()
    const recovered = await recoveredTurn(page, api, before)
    const after = await api.control<FailureFaults>('faults')
    expect(after.inference_requests - failed.inference_requests).toBe(2)
    transientProof.push({ upstream_status: status, client_status: status === 503 ? 502 : 429, rejected_attempts: attempts, provider_attempts: failed.provider_attempts - faultsBefore.provider_attempts, platform_ingress_intervals_ms: intervals,
      before: consumption(before), recovered: consumption(recovered), user_clicked_retry: true })
  }

  const beforeBalance = await api.control<NativeState>('state')
  const faultsBeforeBalance = await api.control<FailureFaults>('faults')
  await api.control('faults', JSON.stringify({ hold_inference_before_auth: true }))
  await sendPrompt(page, 'Read the same file after checking the current account balance.')
  await expect.poll(async () => (await api.control<FailureFaults>('faults')).inference_waiting).toBe(1)
  await api.control('balance', JSON.stringify({ state: 'exhausted' }))
  const empty = await api.control<NativeState>('state')
  expect(Number(empty.balance)).toBe(0)
  await api.control('faults', JSON.stringify({ hold_inference_before_auth: false }))
  await expect(page.getByText('Aino balance or subscription quota is unavailable. Check your account or select another model.', { exact: true }).last()).toBeVisible({ timeout: 30_000 })
  await settled(page)
  const denied = await api.control<NativeState>('state')
  expect(completeConsumption(denied)).toEqual(completeConsumption(empty))
  const deniedFaults = await api.control<FailureFaults>('faults')
  expect(deniedFaults.inference_requests).toBe(faultsBeforeBalance.inference_requests + 1)
  expect(deniedFaults.provider_attempts).toBe(faultsBeforeBalance.provider_attempts)
  expect(denied.usage_calls).toBe(beforeBalance.usage_calls)
  const recovery = page.locator('button.aui-error-action[data-action="account"]').last()
  await expect(recovery).toBeVisible()
  await expect(recovery.locator('..').getByRole('button', { name: /^Retry$/ })).toHaveCount(0)
  await recovery.click()
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  const available = page.getByText('Available balance', { exact: true }).locator('..').locator('p').last()
  await expect(available).toHaveText('0 USD')
  await api.control('balance', JSON.stringify({ state: 'restored' }))
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(available).toHaveText('10 USD')
  await page.goBack()
  expect((await api.control<NativeState>('state')).usage_calls).toBe(beforeBalance.usage_calls)
  const restored = await api.control<NativeState>('state')
  const restoredFaults = await api.control<FailureFaults>('faults')
  expect(restoredFaults.inference_requests).toBe(deniedFaults.inference_requests)
  expect(restoredFaults.credential_requests).toBe(deniedFaults.credential_requests)
  await sendPrompt(page, 'Read the fixture file now that the account balance is restored.')
  const recovered = await recoveredTurn(page, api, restored)
  const finalFaults = await api.control<FailureFaults>('faults')
  expect(finalFaults.gate_timeouts).toBe(0)
  expect(finalFaults.gate_cancellations).toBe(0)
  const alerts = await page.evaluate(() => (window as unknown as FailureWindow).inferenceAlerts)
  expect(alerts.filter(entry => !entry.expected), 'unexpected failure-scenario alerts').toEqual([])

  return { initial: consumption(initial), transient: transientProof,
    balance: { client_http_status: 403, no_automatic_replay: true, denied_faults: deniedFaults, before_explicit_send_faults: restoredFaults, exhausted: consumption(empty), denied: consumption(denied), restored: consumption(restored), recovered: consumption(recovered) },
    final_faults: finalFaults, audit: { unexpected_alerts: 0 } }
}
