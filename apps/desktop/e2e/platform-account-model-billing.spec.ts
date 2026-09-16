import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { buildAppEnv, createSandbox, waitForAppReady, writeEnvFile, writeMockProviderConfig } from './fixtures'
import { startMockServer } from './mock-server'
import { fixtureEnvironment, installLoopbackNodeGuard, installLoopbackPythonGuard, launchGuardedDesktop, type NativeState, persistedFixtureText, startRealPlatformAPI } from './platform-real-api'
import { expect, type Page, test } from './test'

interface NativeWindow {
  hermesDesktop: {
    platformAccount: { status(): Promise<{ account: { id: string } | null; phase: string; error: unknown }> }
    platformModels: { list(): Promise<unknown> }
    platformBilling: { summary(input: { expected_user_id: string }): Promise<{ balance: string }> }
  }
}

type NativeLaunch = Awaited<ReturnType<typeof launchGuardedDesktop>>

interface NativeLaunchAudit {
  unexpectedRendererDestinations: string[]
}

function observeNativeLaunch({ app, page }: NativeLaunch, consoleLines: string[]): NativeLaunchAudit {
  const unexpectedRendererDestinations: string[] = []

  page.on('request', request => {
    const url = new URL(request.url())

    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      unexpectedRendererDestinations.push(url.hostname)
    }
  })
  page.on('console', message => consoleLines.push(message.text()))
  app.process().stdout?.on('data', value => consoleLines.push(String(value)))
  app.process().stderr?.on('data', value => consoleLines.push(String(value)))

  return { unexpectedRendererDestinations }
}

function assertNativeGuardsReady(sandbox: ReturnType<typeof createSandbox>, app: NativeLaunch['app']) {
  for (const marker of ['node-network-guard-active', 'chromium-network-guard-active']) {
    expect(fs.readFileSync(path.join(sandbox.hermesHome, marker), 'utf8').split('\n')).toContain(String(app.process().pid))
  }
}

function assertNoBlockedTransport(sandbox: ReturnType<typeof createSandbox>, launchAudits: NativeLaunchAudit[]) {
  expect(launchAudits.flatMap(audit => audit.unexpectedRendererDestinations)).toEqual([])

  for (const marker of ['blocked-network.txt', 'blocked-node-network.txt', 'blocked-chromium-network.txt']) {
    expect(fs.existsSync(path.join(sandbox.hermesHome, marker))).toBe(false)
  }
}

function pythonGuardPids(sandbox: ReturnType<typeof createSandbox>): Set<number> {
  const markerPath = path.join(sandbox.hermesHome, 'python-network-guard-active')

  if (!fs.existsSync(markerPath)) { return new Set() }

  return new Set(fs.readFileSync(markerPath, 'utf8').split('\n').flatMap(value => {
    const pid = Number(value)

    return Number.isInteger(pid) && pid > 0 ? [pid] : []
  }))
}

function assertNewGuardedBackend(sandbox: ReturnType<typeof createSandbox>, priorGuardPids: Set<number>) {
  const ownershipPath = path.join(sandbox.userDataDir, 'backend-ownership.json')
  const ownership = JSON.parse(fs.readFileSync(ownershipPath, 'utf8')) as { backends?: Array<{ pid?: unknown }> }

  const backendPids = new Set((ownership.backends ?? []).flatMap(entry => {
    const pid = Number(entry.pid)

    return Number.isInteger(pid) && pid > 0 ? [pid] : []
  }))

  const newGuardPids = [...pythonGuardPids(sandbox)].filter(pid => !priorGuardPids.has(pid))

  expect(newGuardPids).not.toEqual([])
  expect(newGuardPids.some(pid => backendPids.has(pid))).toBe(true)
}

function decimalUnits(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value)

  if (!match || /[1-9]/.test((match[3] ?? '').slice(8))) { throw new Error(`Unexpected fixture decimal: ${value}`) }

  const units = BigInt(match[2]) * 100_000_000n + BigInt((match[3] ?? '').slice(0, 8).padEnd(8, '0'))

  return match[1] === '-' ? -units : units
}

test('fixture decimal parser preserves exact eight-place values', () => {
  expect(decimalUnits('0.0003000000')).toBe(30_000n)
  expect(decimalUnits('-1.250000000')).toBe(-125_000_000n)
  expect(() => decimalUnits('0.0003000001')).toThrow('Unexpected fixture decimal')
  expect(() => decimalUnits('not-a-decimal')).toThrow('Unexpected fixture decimal')
})

async function auditRenderer(page: Page, api: Awaited<ReturnType<typeof startRealPlatformAPI>>) {
  const publicData = await page.evaluate(async () => ({
    account: await (window as unknown as NativeWindow).hermesDesktop.platformAccount.status(),
    models: await (window as unknown as NativeWindow).hermesDesktop.platformModels.list(),
    localStorage: { ...localStorage },
    body: document.body.innerText
  }))

  const audit = await api.control<{ leaked: boolean; checked_credentials: number }>('audit', JSON.stringify(publicData))

  expect(audit.leaked).toBe(false)
  expect(audit.checked_credentials).toBeGreaterThan(2)

  return audit
}

async function signInForThisSession(page: Page, api: Awaited<ReturnType<typeof startRealPlatformAPI>>, previousCodeAt = 0) {
  await expect(page.getByRole('textbox', { name: 'Phone number', exact: true })).toBeVisible({ timeout: 90_000 })
  await page.getByRole('checkbox', { name: 'Keep me signed in on this device', exact: true }).uncheck()
  await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill(api.info.phone)
  // Honor the real SMS cooldown before the restart's fresh challenge.
  const remaining = 61_000 - (Date.now() - previousCodeAt)

  if (remaining > 0) { await page.waitForTimeout(Math.min(remaining, 60_000)) }
  await page.getByRole('button', { name: 'Send code', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Verification code', exact: true })).toBeVisible()
  const requestedAt = Date.now()
  const code = await api.control<{ code: string }>('code')
  expect(/^\d{6}$/.test(code.code)).toBe(true)
  await page.getByRole('textbox', { name: 'Verification code', exact: true }).fill(code.code)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect.poll(async () => {
    const account = await page.evaluate(() => (window as unknown as NativeWindow).hermesDesktop.platformAccount.status())

    return { phase: account.phase, error: account.error }
  }, { timeout: 15_000 }).toEqual({ phase: 'signed_in', error: null })

  return requestedAt
}

test('native fixture guards load before real Electron main', async () => {
  test.setTimeout(45_000)
  const sandbox = createSandbox('platform-guard-proof')
  let launched: NativeLaunch | null = null
  const consoleLines: string[] = []

  try {
    fs.writeFileSync(path.join(sandbox.hermesHome, 'config.yaml'), '')
    fs.writeFileSync(path.join(sandbox.userDataDir, 'platform-development.json'), JSON.stringify({ enabled: true, origin: 'http://127.0.0.1:1' }))
    const inherited = buildAppEnv(sandbox)
    const env: Record<string, string> = { ...fixtureEnvironment(), HOME: sandbox.root, HERMES_HOME: sandbox.hermesHome, HERMES_DESKTOP_BOOT_FAKE: '1' }

    for (const key of ['HERMES_DESKTOP_USER_DATA_DIR', 'HERMES_DESKTOP_IGNORE_EXISTING', 'HERMES_DESKTOP_HERMES_ROOT', 'HERMES_DESKTOP_APP_NAME', 'HERMES_DESKTOP_SKIP_QUIT_CONFIRM']) { env[key] = inherited[key] }
    env.PYTHONPATH = installLoopbackPythonGuard(sandbox.root)
    const python = path.resolve(import.meta.dirname, '../../../.venv/bin/python')

    const pythonProof = execFileSync(python, ['-c', `import json, sitecustomize, subprocess
spawned=[]
sitecustomize._popen_init=lambda *args, **kwargs: spawned.append(True)
denied=False
try: subprocess.Popen(['/usr/bin/security','find-generic-password','-s','fixture-no-lookup','-w'])
except FileNotFoundError: denied=True
assert denied and not spawned
print(json.dumps({'credential_read_denied_before_spawn':denied,'spawned_commands':len(spawned)}))
`], { env, encoding: 'utf8' })

    expect(JSON.parse(pythonProof)).toEqual({ credential_read_denied_before_spawn: true, spawned_commands: 0 })
    launched = await launchGuardedDesktop(env, installLoopbackNodeGuard(sandbox.root))
    const launchAudit = observeNativeLaunch(launched, consoleLines)
    assertNativeGuardsReady(sandbox, launched.app)
    // Fail before issuing the probe if Chromium was not guarded at bootstrap.
    expect(fs.existsSync(path.join(sandbox.hermesHome, 'chromium-network-guard-active'))).toBe(true)

    const chromiumProof = await launched.app.evaluate(async ({ net }) => {
      try { await net.fetch('https://fixture.invalid/guard-proof');

 return false } catch (error) {
        return error instanceof Error && error.message.includes('ERR_BLOCKED_BY_CLIENT')
      }
    })

    expect(chromiumProof).toBe(true)
    expect(fs.readFileSync(path.join(sandbox.hermesHome, 'blocked-chromium-network.txt'), 'utf8')).toContain('fixture.invalid')

    const proof = await launched.app.evaluate(async () => {
      try { await globalThis.fetch('https://fixture.invalid/guard-proof');

 return false } catch (error) {
        return error instanceof Error && error.message === 'native fixture forbids non-loopback transport'
      }
    })

    expect(proof).toBe(true)
    expect(fs.readFileSync(path.join(sandbox.hermesHome, 'blocked-node-network.txt'), 'utf8')).toContain('fixture.invalid')
    expect(launchAudit.unexpectedRendererDestinations).toEqual([])
    console.log('Guard proof: actual Electron main and Chromium guards active before bootstrap; nonloopback fetch denied before transport; Python credential read denied with zero subprocesses')
  } finally {
    await launched?.app.close().catch(() => undefined)
    sandbox.cleanup()
  }
})

test('real API account, native managed lease, Python tool roundtrip and wallet', async ({ browserName: _browserName }, testInfo) => {
  test.setTimeout(450_000)
  const repoRoot = path.resolve(import.meta.dirname, '../../..')
  const api = await startRealPlatformAPI(path.resolve(repoRoot, '../Aino-API'))
  const sandbox = createSandbox('platform-native-consumer')
  const byok = await startMockServer()
  let launched: NativeLaunch | null = null
  const consoleLines: string[] = []
  const launchAudits: NativeLaunchAudit[] = []
  let stage = 'launch'
  let primaryError: unknown
  const cleanupErrors: unknown[] = []

  try {
    fs.writeFileSync(path.join(sandbox.hermesHome, 'config.yaml'), 'auxiliary:\n  title_generation:\n    enabled: false\n', { mode: 0o600 })
    fs.writeFileSync(path.join(sandbox.hermesHome, '.env'), '', { mode: 0o600 })
    fs.writeFileSync(path.join(sandbox.userDataDir, 'platform-development.json'), JSON.stringify({ enabled: true, origin: api.info.origin }), { mode: 0o600 })
    const inherited = buildAppEnv(sandbox)
    const env: Record<string, string> = { ...fixtureEnvironment(), HOME: sandbox.root }

    for (const key of ['HERMES_DESKTOP_USER_DATA_DIR', 'HERMES_DESKTOP_IGNORE_EXISTING', 'HERMES_DESKTOP_HERMES_ROOT', 'HERMES_DESKTOP_APP_NAME', 'HERMES_DESKTOP_SKIP_QUIT_CONFIRM']) { env[key] = inherited[key] }
    env.HERMES_HOME = sandbox.hermesHome
    env.HERMES_DESKTOP_CWD = path.dirname(api.info.fixture_path)
    env.PYTHONPATH = installLoopbackPythonGuard(sandbox.root)
    const nodeGuard = installLoopbackNodeGuard(sandbox.root)
    const firstPythonGuardPids = pythonGuardPids(sandbox)

    launched = await launchGuardedDesktop(env, nodeGuard)
    const { app, page } = launched
    launchAudits.push(observeNativeLaunch(launched, consoleLines))
    assertNativeGuardsReady(sandbox, app)
    stage = 'session-only-login'
    const firstCodeAt = await signInForThisSession(page, api)
    stage = 'workspace-ready'
    await waitForAppReady({ app, page } as never, 120_000)
    assertNewGuardedBackend(sandbox, firstPythonGuardPids)
    const snapshot = await page.evaluate(() => (window as unknown as NativeWindow).hermesDesktop.platformAccount.status())
    const initial = await api.control<NativeState>('state')
    expect(snapshot.account?.id).toBe(String(initial.user_id))
    expect(initial.balance).toBe('10.00000000')
    await page.locator('[data-tour="model-pill"]').click()
    await page.getByRole('button', { name: 'Aino models', exact: true }).click()
    await page.getByRole('option', { name: /fixture-tool-model/ }).click()
    await expect(page.locator('[data-tour="model-pill"]')).toContainText('fixture-tool-model')
    await page.screenshot({ path: testInfo.outputPath('platform-native-home-light.png') })

    stage = 'first-platform-tool-turn'
    const composer = page.locator('[contenteditable="true"]').first()
    const composerForm = composer.locator('xpath=ancestor::form')

    await composer.click()
    await composer.pressSequentially(`Read the isolated fixture file ${api.info.fixture_path} using read_file and verify its content.`)
    await page.keyboard.press('Enter')
    await expect(page.getByText(`Verified ${api.info.fixture_content}`, { exact: false }).first()).toBeVisible({ timeout: 90_000 })
    await expect.poll(async () => (await api.control<NativeState>('state')).usage_calls).toBe(2)
    const settled = await api.control<NativeState>('state')
    expect(settled.tool_results).toBe(1)
    expect(settled.usage_turns).toBe(1)
    expect(Number(initial.balance) - Number(settled.balance)).toBeCloseTo(Number(settled.usage_cost), 8)
    stage = 'stream-cancel'
    const sessionUrl = page.url()
    await expect(composerForm.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0)
    await composer.click()
    await composer.pressSequentially('fixture-cancel-stream')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await api.control<NativeState>('state')).stream_started).toBe(1)
    await composerForm.getByRole('button', { name: 'Stop', exact: true }).click()
    await expect(composerForm.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0)
    await expect.poll(async () => (await api.control<NativeState>('state')).downstream_disconnects, { timeout: 15_000 }).toBe(1)
    await expect.poll(async () => (await api.control<NativeState>('state')).stream_drained, { timeout: 15_000 }).toBe(1)
    await expect.poll(async () => (await api.control<NativeState>('state')).usage_calls, { timeout: 15_000 }).toBe(3)
    const cancelled = await api.control<NativeState>('state')
    expect(cancelled.model_calls).toBe(3)
    expect(cancelled.stream_cancelled).toBe(0)
    expect(cancelled.stream_timeouts).toBe(0)
    expect(cancelled.stream_shutdowns).toBe(0)
    expect(decimalUnits(initial.balance) - decimalUnits(cancelled.balance)).toBe(decimalUnits(cancelled.usage_cost))

    stage = 'native-recharge'
    await page.getByRole('button', { name: /^My account/ }).click()
    await page.getByRole('button', { name: 'Recharge', exact: true }).click()
    await page.getByRole('textbox', { name: 'Recharge amount', exact: true }).fill('20')
    await page.getByRole('button', { name: 'Get quote', exact: true }).click()
    expect((await api.control<NativeState>('state')).orders).toBe(0)
    await page.getByRole('button', { name: 'Confirm order', exact: true }).click()
    await expect.poll(async () => (await api.control<NativeState>('state')).payment_calls).toBe(1)
    await api.control('pay', '')
    await page.getByRole('button', { name: 'Refresh order', exact: true }).click()
    await expect(page.getByText('Recharge complete', { exact: true })).toBeVisible()
    const paid = await api.control<NativeState>('state')
    expect(paid.orders).toBe(1)
    expect(paid.payment_calls).toBe(1)
    expect(Number(paid.balance) + Number(paid.usage_cost)).toBeCloseTo(12.8, 8)
    const wallet = await page.evaluate(id => (window as unknown as NativeWindow).hermesDesktop.platformBilling.summary({ expected_user_id: id }), snapshot.account!.id)
    expect(wallet.balance).toBe(paid.balance)
    await page.screenshot({ path: testInfo.outputPath('platform-native-recharge.png') })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')

    const initialAudit = await auditRenderer(page, api)
    assertNoBlockedTransport(sandbox, launchAudits)
    expect(fs.existsSync(path.join(sandbox.hermesHome, 'node-network-guard-active'))).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('platform-native-tool-reply.png') })
    // Custom provider is introduced only AFTER proving fresh no-BYOK use.
    stage = 'restart-platform-history'
    await app.close()
    launched = null
    expect(fs.readFileSync(path.join(sandbox.hermesHome, 'config.yaml'), 'utf8')).not.toContain(byok.url)
    const resumedPythonGuardPids = pythonGuardPids(sandbox)

    launched = await launchGuardedDesktop(env, nodeGuard)
    const restarted = launched.page
    launchAudits.push(observeNativeLaunch(launched, consoleLines))
    assertNativeGuardsReady(sandbox, launched.app)
    const secondCodeAt = await signInForThisSession(restarted, api, firstCodeAt)
    await waitForAppReady(launched as never, 120_000)
    assertNewGuardedBackend(sandbox, resumedPythonGuardPids)
    expect((await restarted.evaluate(() => (window as unknown as NativeWindow).hermesDesktop.platformAccount.status())).account?.id).toBe(snapshot.account!.id)
    await restarted.goto(sessionUrl)
    await expect(restarted.getByText(`Verified ${api.info.fixture_content}`, { exact: false }).first()).toBeVisible({ timeout: 60_000 })
    const resumeComposer = restarted.locator('[contenteditable="true"]').first()
    const resumeComposerForm = resumeComposer.locator('xpath=ancestor::form')

    const beforeResume = await api.control<NativeState>('state')
    await resumeComposer.click()
    await resumeComposer.pressSequentially(`Read the isolated file again after restart: ${api.info.fixture_path}`)
    await restarted.keyboard.press('Enter')
    await expect.poll(async () => (await api.control<NativeState>('state')).tool_results).toBe(beforeResume.tool_results + 1)
    await expect.poll(async () => (await api.control<NativeState>('state')).usage_calls).toBe(beforeResume.usage_calls + 2)
    await expect(resumeComposerForm.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0)
    const restartAudit = await auditRenderer(restarted, api)
    assertNoBlockedTransport(sandbox, launchAudits)
    await launched.app.close()
    launched = null

    // The recovery pair above proves platform history and billing before any
    // custom provider exists. A third real launch is the supported reload path.
    writeMockProviderConfig(sandbox.hermesHome, byok.url)
    writeEnvFile(sandbox.hermesHome)
    stage = 'custom-provider-restart'
    const byokPythonGuardPids = pythonGuardPids(sandbox)

    launched = await launchGuardedDesktop(env, nodeGuard)
    const customProvider = launched.page
    launchAudits.push(observeNativeLaunch(launched, consoleLines))
    assertNativeGuardsReady(sandbox, launched.app)
    await signInForThisSession(customProvider, api, secondCodeAt)
    await waitForAppReady(launched as never, 120_000)
    assertNewGuardedBackend(sandbox, byokPythonGuardPids)
    expect((await customProvider.evaluate(() => (window as unknown as NativeWindow).hermesDesktop.platformAccount.status())).account?.id).toBe(snapshot.account!.id)
    stage = 'custom-provider-switch'
    await customProvider.locator('[data-tour="model-pill"]').first().click()
    await customProvider.getByRole('button', { name: 'Custom models', exact: true }).click()
    await customProvider.getByRole('menuitem', { name: /mock-model/ }).first().click()
    const beforeBYOK = await api.control<NativeState>('state')
    const byokComposer = customProvider.locator('[contenteditable="true"]').first()
    await byokComposer.click()
    await byokComposer.pressSequentially('Hello from an isolated custom provider')
    await customProvider.keyboard.press('Enter')
    await expect(customProvider.getByText('Hello from the mock inference server!', { exact: false }).first()).toBeVisible({ timeout: 60_000 })
    const afterBYOK = await api.control<NativeState>('state')
    expect(afterBYOK.balance).toBe(beforeBYOK.balance)
    expect(afterBYOK.model_calls).toBe(beforeBYOK.model_calls)
    expect(afterBYOK.usage_calls).toBe(beforeBYOK.usage_calls)
    expect(fs.readFileSync(path.join(sandbox.hermesHome, 'config.yaml'), 'utf8')).toContain(byok.url)
    const byokAudit = await auditRenderer(customProvider, api)
    assertNoBlockedTransport(sandbox, launchAudits)
    const receipt = { run_id: api.info.run_id, api_sha: api.apiSha, aino_sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(), initial, settled, cancelled, paid, beforeBYOK, afterBYOK, initialAudit, restartAudit, byokAudit, api_log: api.logPath }
    await testInfo.attach('native-receipt', { body: JSON.stringify(receipt, null, 2), contentType: 'application/json' })
    fs.writeFileSync(path.join(api.dir, 'native-receipt.json'), JSON.stringify(receipt, null, 2), { mode: 0o600 })
    await launched.app.close()
    launched = null
    assertNoBlockedTransport(sandbox, launchAudits)
    const persistedAudit = await api.control<{ leaked: boolean }>('audit', JSON.stringify([...persistedFixtureText(sandbox.hermesHome), ...persistedFixtureText(sandbox.userDataDir), fs.readFileSync(api.logPath, 'utf8'), ...consoleLines]))
    expect(persistedAudit.leaked).toBe(false)
  } catch (error) {
    primaryError = error
    const state = await api.control<NativeState>('state').catch(() => null)
    const account = launched ? await launched.page.evaluate(() => (window as unknown as NativeWindow).hermesDesktop.platformAccount.status()).catch(() => null) : null
    const failure = { run_id: api.info.run_id, stage, state, account }
    fs.writeFileSync(path.join(api.dir, 'native-failure.json'), JSON.stringify(failure, null, 2), { mode: 0o600 })
    const diagnostics: string[] = [...consoleLines]
    const logDir = path.join(sandbox.hermesHome, 'logs')

    for (const entry of fs.existsSync(logDir) ? fs.readdirSync(logDir, { withFileTypes: true }) : []) {
      if (entry.isFile() && entry.name.endsWith('.log')) { diagnostics.push(fs.readFileSync(path.join(sandbox.hermesHome, 'logs', entry.name), 'utf8')) }
    }

    const text = diagnostics.join('\n')
    const checked = await api.control<{ leaked: boolean }>('audit', text).catch(() => ({ leaked: true }))

    if (!checked.leaked) { fs.writeFileSync(path.join(api.dir, 'native-diagnostics.log'), text, { mode: 0o600 }) }

    if (launched) { await launched.page.screenshot({ path: testInfo.outputPath('native-failure.png') }).catch(() => undefined) }
    console.log(`Native fixture failed at ${stage}; run_id=${api.info.run_id}; private evidence=${api.dir}`)
  } finally {
    try { await launched?.app.close() } catch (error) { cleanupErrors.push(error) }

    try { await api.close() } catch (error) { cleanupErrors.push(error) }

    try { await byok.close() } catch (error) { cleanupErrors.push(error) }

    try { sandbox.cleanup() } catch (error) { cleanupErrors.push(error) }
  }

  if (primaryError !== undefined && cleanupErrors.length > 0) {
    throw new AggregateError([primaryError, ...cleanupErrors], 'Native fixture failed and cleanup did not complete')
  }

  if (primaryError !== undefined) { throw primaryError }

  if (cleanupErrors.length > 0) { throw new AggregateError(cleanupErrors, 'Native fixture cleanup failed') }
})
