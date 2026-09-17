import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { buildAppEnv, createSandbox, waitForAppReady, writeEnvFile, writeMockProviderConfig } from './fixtures'
import { startMockServer } from './mock-server'
import { auditFixtureText, fixtureEnvironment, installLoopbackNodeGuard, installLoopbackPythonGuard, isExpectedBlockedThemeFontRequest, KNOWN_BLOCKED_THEME_FONT_URL, launchGuardedDesktop, type NativeState, type NativeTransportAudit, persistedFixtureText, startRealPlatformAPI } from './platform-real-api'
import { verifyWebsiteWallet } from './platform-website-wallet'
import { seedPlatformWorkspace, verifyPlatformWorkspace } from './platform-workspace-proof'
import { expect, type Page, test } from './test'

interface NativeWindow {
  hermesDesktop: {
    platformAccount: { status(): Promise<{ account: { id: string } | null; phase: string; error: unknown }> }
    platformModels: { list(): Promise<unknown> }
    platformBilling: { summary(input: { expected_user_id: string }): Promise<{ balance: string }> }
  }
}

type NativeLaunch = Awaited<ReturnType<typeof launchGuardedDesktop>>

test('transport audit accepts only the inert denied theme stylesheet shape', () => {
  const stylesheet = { url: KNOWN_BLOCKED_THEME_FONT_URL, method: 'GET', resourceType: 'stylesheet', hasUploadData: false, hasAuthorization: false }

  expect(isExpectedBlockedThemeFontRequest(stylesheet)).toBe(true)
  expect(isExpectedBlockedThemeFontRequest({ ...stylesheet, resourceType: 'xhr' })).toBe(false)
  expect(isExpectedBlockedThemeFontRequest({ ...stylesheet, method: 'POST', hasUploadData: true })).toBe(false)
  expect(isExpectedBlockedThemeFontRequest({ ...stylesheet, hasAuthorization: true })).toBe(false)
  expect(isExpectedBlockedThemeFontRequest({ ...stylesheet, hasUploadData: true })).toBe(false)
  expect(isExpectedBlockedThemeFontRequest({ ...stylesheet, url: 'https://fixture.invalid/stylesheet' })).toBe(false)
})

function observeNativeLaunch({ app, page, transportAudit }: NativeLaunch, consoleLines: string[]): NativeTransportAudit {
  page.on('console', message => consoleLines.push(message.text()))
  app.process().stdout?.on('data', value => consoleLines.push(String(value)))
  app.process().stderr?.on('data', value => consoleLines.push(String(value)))

  return transportAudit
}

function assertNativeGuardsReady(sandbox: ReturnType<typeof createSandbox>, app: NativeLaunch['app']) {
  for (const marker of ['node-network-guard-active', 'chromium-network-guard-active']) {
    expect(fs.readFileSync(path.join(sandbox.hermesHome, marker), 'utf8').split('\n')).toContain(String(app.process().pid))
  }
}

function deniedDestinations(sandbox: ReturnType<typeof createSandbox>, marker: string): string[] {
  const markerPath = path.join(sandbox.hermesHome, marker)

  return fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf8').trim().split('\n').filter(Boolean) : []
}

async function assertNoBlockedTransport(sandbox: ReturnType<typeof createSandbox>, launchAudits: NativeTransportAudit[]) {
  await Promise.all(launchAudits.flatMap(audit => audit.pending))
  expect(launchAudits.flatMap(audit => audit.unexpectedRendererDestinations)).toEqual([])
  expect(launchAudits.flatMap(audit => audit.knownBlockedThemeFontHosts).every(host => host === 'fonts.googleapis.com')).toBe(true)

  for (const marker of ['blocked-network.txt', 'blocked-node-network.txt']) {
    expect(deniedDestinations(sandbox, marker), `${marker}: denied destinations`).toEqual([])
  }

  const profilesRoot = path.join(sandbox.hermesHome, 'profiles')

  for (const profile of fs.existsSync(profilesRoot) ? fs.readdirSync(profilesRoot, { withFileTypes: true }) : []) {
    if (!profile.isDirectory()) { continue }
    const profileSandbox = { ...sandbox, hermesHome: path.join(profilesRoot, profile.name) }

    expect(deniedDestinations(profileSandbox, 'blocked-network.txt'), `${profile.name}: denied Python destinations`).toEqual([])
  }

  const unexpectedChromiumHosts = deniedDestinations(sandbox, 'blocked-chromium-network.txt')

  const expectedFontHosts = launchAudits.flatMap(audit => {
    const candidates = deniedDestinations(sandbox, `blocked-chromium-font-candidate-${audit.mainPid}.txt`)
    const verified = deniedDestinations(sandbox, `verified-theme-font-denial-${audit.mainPid}.txt`)

    expect(deniedDestinations(sandbox, `font-observer-error-${audit.mainPid}.txt`)).toEqual([])
    expect(deniedDestinations(sandbox, `unexpected-theme-font-shape-${audit.mainPid}.txt`)).toEqual([])
    expect(candidates, `every font candidate from launch ${audit.mainPid} must be independently verified`).toEqual(verified)

    return candidates
  })

  expect(unexpectedChromiumHosts, 'blocked-chromium-network.txt: denied destinations').toEqual([])
  expect(expectedFontHosts).not.toEqual([])
  expect(expectedFontHosts.every(host => host === 'fonts.googleapis.com')).toBe(true)

  return { expectedFontHosts }
}

function assertChromiumGuardProof(sandbox: ReturnType<typeof createSandbox>, mainPid: number) {
  const expectedFontHosts = deniedDestinations(sandbox, `blocked-chromium-font-candidate-${mainPid}.txt`)
  const unexpectedHosts = deniedDestinations(sandbox, 'blocked-chromium-network.txt')

  expect(expectedFontHosts).toContain('fonts.googleapis.com')
  expect(unexpectedHosts).toContain('fixture.invalid')
  expect(unexpectedHosts).toContain('fonts.googleapis.com')
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

function prepareNativePlatformEnvironment(
  sandbox: ReturnType<typeof createSandbox>,
  api: Awaited<ReturnType<typeof startRealPlatformAPI>>
) {
  fs.writeFileSync(path.join(sandbox.hermesHome, 'config.yaml'), 'auxiliary:\n  title_generation:\n    enabled: false\n', { mode: 0o600 })
  fs.writeFileSync(path.join(sandbox.hermesHome, '.env'), '', { mode: 0o600 })
  seedPlatformWorkspace(sandbox)
  fs.writeFileSync(path.join(sandbox.userDataDir, 'platform-development.json'), JSON.stringify({ enabled: true, origin: api.info.origin }), { mode: 0o600 })
  const inherited = buildAppEnv(sandbox)
  const env: Record<string, string> = { ...fixtureEnvironment(), HOME: sandbox.root }

  for (const key of ['HERMES_DESKTOP_USER_DATA_DIR', 'HERMES_DESKTOP_IGNORE_EXISTING', 'HERMES_DESKTOP_HERMES_ROOT', 'HERMES_DESKTOP_APP_NAME', 'HERMES_DESKTOP_SKIP_QUIT_CONFIRM']) { env[key] = inherited[key] }
  env.HERMES_HOME = sandbox.hermesHome
  env.HERMES_DESKTOP_CWD = path.dirname(api.info.fixture_path)
  env.PYTHONPATH = installLoopbackPythonGuard(sandbox.root)

  return {
    env,
    nodeGuard: installLoopbackNodeGuard(sandbox.root),
    pythonGuardPids: pythonGuardPids(sandbox)
  }
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

async function rechargeNativeWallet(
  page: Page,
  api: Awaited<ReturnType<typeof startRealPlatformAPI>>,
  accountID: string,
  screenshotPath: string
) {
  const before = await api.control<NativeState>('state')

  await page.getByRole('button', { name: /^My account/ }).click()
  await page.getByRole('button', { name: 'Recharge', exact: true }).click()
  await page.getByRole('textbox', { name: 'Recharge amount', exact: true }).fill('20')
  await page.getByRole('button', { name: 'Get quote', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm order', exact: true })).toBeEnabled()
  expect((await api.control<NativeState>('state')).orders).toBe(before.orders)
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click()
  await expect.poll(async () => (await api.control<NativeState>('state')).payment_calls).toBe(before.payment_calls + 1)
  // The fixture sends the real signed callback twice through the payment handler.
  await api.control('pay', '')
  await page.getByRole('button', { name: 'Refresh order', exact: true }).click()
  await expect(page.getByText('Recharge complete', { exact: true })).toBeVisible()
  const paid = await api.control<NativeState>('state')

  expect(paid.orders).toBe(before.orders + 1)
  expect(paid.payment_calls).toBe(before.payment_calls + 1)
  expect(decimalUnits(paid.balance) - decimalUnits(before.balance)).toBe(decimalUnits('2.8'))
  expect(paid.usage_calls).toBe(before.usage_calls)
  const wallet = await page.evaluate(id => (window as unknown as NativeWindow).hermesDesktop.platformBilling.summary({ expected_user_id: id }), accountID)

  expect(wallet.balance).toBe(paid.balance)
  await page.screenshot({ path: screenshotPath })
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  return { before, paid, wallet }
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

    const fontProof = await launched.page.evaluate(url => new Promise<boolean>(resolve => {
      const link = document.createElement('link')

      link.rel = 'stylesheet'
      link.href = url
      link.onload = () => resolve(false)
      link.onerror = () => resolve(true)
      document.head.appendChild(link)
    }), KNOWN_BLOCKED_THEME_FONT_URL)

    const sameURLFetchProof = await launched.app.evaluate(async ({ net }) => {
      try {
        await net.fetch('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap')

        return false
      } catch (error) {
        return error instanceof Error && error.message.includes('ERR_BLOCKED_BY_CLIENT')
      }
    })

    expect(fontProof).toBe(true)
    expect(sameURLFetchProof).toBe(true)
    assertChromiumGuardProof(sandbox, launchAudit.mainPid)
    await Promise.all(launchAudit.pending)
    const candidates = deniedDestinations(sandbox, `blocked-chromium-font-candidate-${launchAudit.mainPid}.txt`)

    expect(deniedDestinations(sandbox, `font-observer-error-${launchAudit.mainPid}.txt`)).toEqual([])
    expect(candidates).toEqual(deniedDestinations(sandbox, `verified-theme-font-denial-${launchAudit.mainPid}.txt`))
    expect(launchAudit.unexpectedRendererDestinations).toEqual([])

    await launched.app.context().setExtraHTTPHeaders({ Authorization: 'Bearer fixture-denied-font-probe' })

    const authFontProof = await launched.page.evaluate(url => new Promise<boolean>(resolve => {
      const link = document.createElement('link')

      link.rel = 'stylesheet'
      link.href = url
      link.onload = () => resolve(false)
      link.onerror = () => resolve(true)
      document.head.appendChild(link)
    }), KNOWN_BLOCKED_THEME_FONT_URL)

    await launched.app.context().setExtraHTTPHeaders({})
    await Promise.all(launchAudit.pending)
    expect(authFontProof).toBe(true)
    expect(launchAudit.unexpectedRendererDestinations).toEqual(['fonts.googleapis.com'])
    expect(deniedDestinations(sandbox, `unexpected-theme-font-shape-${launchAudit.mainPid}.txt`)).toEqual(['fonts.googleapis.com'])

    const proof = await launched.app.evaluate(async () => {
      try { await globalThis.fetch('https://fixture.invalid/guard-proof');

 return false } catch (error) {
        return error instanceof Error && error.message === 'native fixture forbids non-loopback transport'
      }
    })

    expect(proof).toBe(true)
    expect(fs.readFileSync(path.join(sandbox.hermesHome, 'blocked-node-network.txt'), 'utf8')).toContain('fixture.invalid')
    console.log('Guard proof: actual Electron main and Chromium guards active before bootstrap; nonloopback fetch denied before transport; Python credential read denied with zero subprocesses')
  } finally {
    await launched?.app.close().catch(() => undefined)
    sandbox.cleanup()
  }
})

test('real website wallet uses an independent phone login', async ({ browserName: _browserName }, testInfo) => {
  test.setTimeout(120_000)
  const repoRoot = path.resolve(import.meta.dirname, '../../..')
  const api = await startRealPlatformAPI(path.resolve(repoRoot, '../Aino-API'))
  let primaryError: unknown

  try {
    const website = await verifyWebsiteWallet({ api, frontendDist: path.join(repoRoot, '../Aino-API/backend/internal/web/dist'), previousCodeAt: 0, screenshotPath: testInfo.outputPath('platform-website-wallet.png') })
    const state = await api.control<NativeState>('state')
    expect(website.accountId).toBe(String(state.user_id))
    expect(website.balance).toBe(Number(state.balance).toFixed(2))
    expect(state.usage_calls).toBe(0)
    expect(state.orders).toBe(0)
    await testInfo.attach('website-receipt', { body: JSON.stringify(website), contentType: 'application/json' })
  } catch (error) {
    primaryError = error
  }

  try { await api.close() } catch (error) {
    if (primaryError !== undefined) { throw new AggregateError([primaryError, error], 'Website fixture and cleanup failed') }
    throw error
  }

  if (primaryError !== undefined) { throw primaryError }
})

test('real API workspace switch preserves platform account across native windows', async ({ browserName: _browserName }, testInfo) => {
  test.setTimeout(180_000)
  const repoRoot = path.resolve(import.meta.dirname, '../../..')
  const sandbox = createSandbox('platform-native-workspace')
  let api: Awaited<ReturnType<typeof startRealPlatformAPI>> | null = null
  let launched: NativeLaunch | null = null
  const consoleLines: string[] = []
  const launchAudits: NativeTransportAudit[] = []
  let primaryError: unknown
  const cleanupErrors: unknown[] = []

  try {
    api = await startRealPlatformAPI(path.resolve(repoRoot, '../Aino-API'))
    const prepared = prepareNativePlatformEnvironment(sandbox, api)

    launched = await launchGuardedDesktop(prepared.env, prepared.nodeGuard)
    launchAudits.push(observeNativeLaunch(launched, consoleLines))
    assertNativeGuardsReady(sandbox, launched.app)
    await signInForThisSession(launched.page, api)
    await waitForAppReady(launched as never, 120_000)
    assertNewGuardedBackend(sandbox, prepared.pythonGuardPids)

    const initialAccount = await launched.page.evaluate(() => (window as unknown as NativeWindow).hermesDesktop.platformAccount.status())
    const initial = await api.control<NativeState>('state')

    expect(initialAccount.account?.id).toBe(String(initial.user_id))
    expect(initial.usage_calls).toBe(0)
    expect(initial.tool_results).toBe(0)
    expect(initial.orders).toBe(0)

    const screenshotPath = testInfo.outputPath('platform-native-workspace.png')
    const workspace = await verifyPlatformWorkspace(launched, api, sandbox, initialAccount.account!.id, screenshotPath)
    const chargedUnits = decimalUnits(workspace.before.balance) - decimalUnits(workspace.after.balance)
    const recordedCostUnits = decimalUnits(workspace.after.usage_cost) - decimalUnits(workspace.before.usage_cost)

    expect(workspace.after.usage_calls - workspace.before.usage_calls).toBe(2)
    expect(workspace.after.tool_results - workspace.before.tool_results).toBe(1)
    expect(workspace.after.orders).toBe(0)
    expect(workspace.after.orders).toBe(workspace.before.orders)
    expect(chargedUnits).toBe(recordedCostUnits)

    const rendererAudit = await auditRenderer(launched.page, api)
    const transport = await assertNoBlockedTransport(sandbox, launchAudits)

    await launched.app.close()
    launched = null

    const persistedAudit = await auditFixtureText(api, [
      ...persistedFixtureText(sandbox.hermesHome),
      ...persistedFixtureText(sandbox.userDataDir),
      fs.readFileSync(api.logPath, 'utf8'),
      ...consoleLines
    ])

    expect(persistedAudit.leaked).toBe(false)

    const receipt = {
      run_id: api.info.run_id,
      source: {
        aino_sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
        api_sha: api.apiSha
      },
      identity: {
        initial_account_id: initialAccount.account!.id,
        workspace_account_id: workspace.account_id,
        workspace_profile: workspace.profile,
        distinct_guarded_backend: workspace.distinct_guarded_backend,
        peer_account_matches: workspace.peer_account_matches,
        peer_wallet_matches: workspace.peer_wallet_matches,
        hide_show_preserves_account: workspace.hide_show_preserves_account,
        hide_show_preserves_wallet: workspace.hide_show_preserves_wallet
      },
      amounts: {
        before_balance: workspace.before.balance,
        after_balance: workspace.after.balance,
        charged_units: chargedUnits.toString(),
        recorded_cost_units: recordedCostUnits.toString()
      },
      counters: {
        usage_calls: workspace.after.usage_calls - workspace.before.usage_calls,
        tool_results: workspace.after.tool_results - workspace.before.tool_results,
        orders: workspace.after.orders
      },
      audits: {
        renderer: rendererAudit,
        peer_renderer: workspace.peerAudit,
        persisted: persistedAudit,
        transport: {
          denied_public_font_hosts: transport.expectedFontHosts,
          blocked_before_transport: true
        }
      },
      screenshot: 'platform-native-workspace.png'
    }

    await testInfo.attach('workspace-native-receipt', { body: JSON.stringify(receipt, null, 2), contentType: 'application/json' })
    await testInfo.attach('workspace-native-screenshot', { path: screenshotPath, contentType: 'image/png' })
  } catch (error) {
    primaryError = error
  } finally {
    try { await launched?.app.close() } catch (error) { cleanupErrors.push(error) }

    try { await api?.close() } catch (error) { cleanupErrors.push(error) }

    try { sandbox.cleanup() } catch (error) { cleanupErrors.push(error) }
  }

  if (primaryError !== undefined && cleanupErrors.length > 0) {
    throw new AggregateError([primaryError, ...cleanupErrors], 'Native workspace fixture failed and cleanup did not complete')
  }

  if (primaryError !== undefined) { throw primaryError }

  if (cleanupErrors.length > 0) { throw new AggregateError(cleanupErrors, 'Native workspace fixture cleanup failed') }
})

test('desktop recharge reaches the same wallet through independent website login', async ({ browserName: _browserName }, testInfo) => {
  test.setTimeout(180_000)
  const repoRoot = path.resolve(import.meta.dirname, '../../..')
  const sandbox = createSandbox('platform-recharge-website')
  let api: Awaited<ReturnType<typeof startRealPlatformAPI>> | null = null
  let launched: NativeLaunch | null = null
  const consoleLines: string[] = []
  const launchAudits: NativeTransportAudit[] = []
  let primaryError: unknown
  const cleanupErrors: unknown[] = []

  try {
    api = await startRealPlatformAPI(path.resolve(repoRoot, '../Aino-API'))
    const prepared = prepareNativePlatformEnvironment(sandbox, api)

    launched = await launchGuardedDesktop(prepared.env, prepared.nodeGuard)
    launchAudits.push(observeNativeLaunch(launched, consoleLines))
    assertNativeGuardsReady(sandbox, launched.app)
    const codeAt = await signInForThisSession(launched.page, api)

    await waitForAppReady(launched as never, 120_000)
    assertNewGuardedBackend(sandbox, prepared.pythonGuardPids)
    const account = await launched.page.evaluate(() => (window as unknown as NativeWindow).hermesDesktop.platformAccount.status())
    const recharge = await rechargeNativeWallet(launched.page, api, account.account!.id, testInfo.outputPath('desktop-recharge.png'))

    const website = await verifyWebsiteWallet({
      api,
      frontendDist: path.join(repoRoot, '../Aino-API/backend/internal/web/dist'),
      previousCodeAt: codeAt,
      screenshotPath: testInfo.outputPath('website-recharged-wallet.png')
    })

    const finalState = await api.control<NativeState>('state')
    const desktopWallet = await launched.page.evaluate(id => (window as unknown as NativeWindow).hermesDesktop.platformBilling.summary({ expected_user_id: id }), account.account!.id)

    expect(website.accountId).toBe(account.account!.id)
    expect(website.accountId).toBe(String(finalState.user_id))
    expect(website.balance).toBe(Number(recharge.paid.balance).toFixed(2))
    expect(desktopWallet.balance).toBe(finalState.balance)
    expect(finalState.balance).toBe(recharge.paid.balance)
    expect(finalState.orders).toBe(1)
    expect(finalState.payment_calls).toBe(1)
    expect(finalState.usage_calls).toBe(0)
    expect(finalState.model_calls).toBe(0)
    const rendererAudit = await auditRenderer(launched.page, api)
    const transport = await assertNoBlockedTransport(sandbox, launchAudits)

    await launched.app.close()
    launched = null

    const persistedAudit = await auditFixtureText(api, [
      ...persistedFixtureText(sandbox.hermesHome),
      ...persistedFixtureText(sandbox.userDataDir),
      fs.readFileSync(api.logPath, 'utf8'),
      ...consoleLines
    ])

    expect(persistedAudit.leaked).toBe(false)
    await testInfo.attach('cross-client-recharge-receipt', {
      body: JSON.stringify({
        run_id: api.info.run_id,
        aino_sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
        api_sha: api.apiSha,
        account_id: website.accountId,
        before_balance: recharge.before.balance,
        after_balance: finalState.balance,
        credited_units: (decimalUnits(finalState.balance) - decimalUnits(recharge.before.balance)).toString(),
        orders: finalState.orders,
        payment_calls: finalState.payment_calls,
        usage_calls: finalState.usage_calls,
        model_calls: finalState.model_calls,
        desktop_balance: desktopWallet.balance,
        website,
        rendererAudit,
        persistedAudit,
        transport: { denied_public_font_hosts: transport.expectedFontHosts, blocked_before_transport: true }
      }, null, 2),
      contentType: 'application/json'
    })
  } catch (error) {
    primaryError = error
  } finally {
    try { await launched?.app.close() } catch (error) { cleanupErrors.push(error) }

    try { await api?.close() } catch (error) { cleanupErrors.push(error) }

    try { sandbox.cleanup() } catch (error) { cleanupErrors.push(error) }
  }

  if (primaryError !== undefined && cleanupErrors.length > 0) {
    throw new AggregateError([primaryError, ...cleanupErrors], 'Cross-client recharge fixture and cleanup failed')
  }

  if (primaryError !== undefined) { throw primaryError }

  if (cleanupErrors.length > 0) { throw new AggregateError(cleanupErrors, 'Cross-client recharge fixture cleanup failed') }
})

test('real API account, native managed lease, Python tool roundtrip and wallet', async ({ browserName: _browserName }, testInfo) => {
  test.setTimeout(450_000)
  const repoRoot = path.resolve(import.meta.dirname, '../../..')
  const api = await startRealPlatformAPI(path.resolve(repoRoot, '../Aino-API'))
  const sandbox = createSandbox('platform-native-consumer')
  const byok = await startMockServer()
  let launched: NativeLaunch | null = null
  const consoleLines: string[] = []
  const launchAudits: NativeTransportAudit[] = []
  let stage = 'launch'
  let primaryError: unknown
  const cleanupErrors: unknown[] = []

  try {
    const prepared = prepareNativePlatformEnvironment(sandbox, api)
    const { env, nodeGuard, pythonGuardPids: firstPythonGuardPids } = prepared

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
    const { paid } = await rechargeNativeWallet(page, api, snapshot.account!.id, testInfo.outputPath('platform-native-recharge.png'))

    const initialAudit = await auditRenderer(page, api)
    await assertNoBlockedTransport(sandbox, launchAudits)
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
    await assertNoBlockedTransport(sandbox, launchAudits)
    stage = 'workspace-switch'
    const workspace = await verifyPlatformWorkspace(launched, api, sandbox, snapshot.account!.id, testInfo.outputPath('platform-native-workspace.png'))
    await assertNoBlockedTransport(sandbox, launchAudits)
    expect(decimalUnits(workspace.before.balance) - decimalUnits(workspace.after.balance)).toBe(decimalUnits(workspace.after.usage_cost) - decimalUnits(workspace.before.usage_cost))
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
    const thirdCodeAt = await signInForThisSession(customProvider, api, secondCodeAt)
    await waitForAppReady(launched as never, 120_000)
    assertNewGuardedBackend(sandbox, byokPythonGuardPids)
    expect((await customProvider.evaluate(() => (window as unknown as NativeWindow).hermesDesktop.platformAccount.status())).account?.id).toBe(snapshot.account!.id)
    stage = 'custom-provider-switch'
    await customProvider.locator('[data-tour="model-pill"]').first().click()
    await customProvider.getByRole('button', { name: 'Custom models', exact: true }).click()
    await customProvider.getByRole('menuitem', { name: /Mock Model/ }).first().click()
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
    stage = 'website-wallet'
    const website = await verifyWebsiteWallet({ api, frontendDist: path.join(repoRoot, '../Aino-API/backend/internal/web/dist'), previousCodeAt: thirdCodeAt, screenshotPath: testInfo.outputPath('platform-website-wallet.png') })
    expect(website.accountId).toBe(snapshot.account!.id)
    expect(website.balance).toBe(Number(afterBYOK.balance).toFixed(2))
    const transport = await assertNoBlockedTransport(sandbox, launchAudits)
    const receipt = { run_id: api.info.run_id, api_sha: api.apiSha, aino_sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(), initial, settled, cancelled, paid, workspace, beforeBYOK, afterBYOK, website, initialAudit, restartAudit, byokAudit, transport: { known_public_font: { host: 'fonts.googleapis.com', attempted: true, blocked_before_transport: true, delivered: false, denied_hosts: transport.expectedFontHosts } }, api_log: api.logPath }
    await testInfo.attach('native-receipt', { body: JSON.stringify(receipt, null, 2), contentType: 'application/json' })
    fs.writeFileSync(path.join(api.dir, 'native-receipt.json'), JSON.stringify(receipt, null, 2), { mode: 0o600 })
    await launched.app.close()
    launched = null
    await assertNoBlockedTransport(sandbox, launchAudits)
    const persistedAudit = await auditFixtureText(api, [...persistedFixtureText(sandbox.hermesHome), ...persistedFixtureText(sandbox.userDataDir), fs.readFileSync(api.logPath, 'utf8'), ...consoleLines])
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
