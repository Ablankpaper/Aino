import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

const DRIVER_PATH = fileURLToPath(new URL(
  '../../../tests/install/e2e-assets/launch-from-spec.mjs',
  import.meta.url,
))

const EXPECTED_SHA = 'abcdef0123456789abcdef0123456789abcdef01'

function adapterSetupSource() {
  return `
import { registerHooks } from 'node:module'

const asModuleUrl = source =>
  \`data:text/javascript;base64,\${Buffer.from(source).toString('base64')}\`

const playwrightUrl = asModuleUrl(\`
let launches = 0
export const _electron = {
  launch: async () => {
    const kind = launches++ === 0 ? 'initial' : 'relaunch'
    return { kind, windows: () => [kind] }
  },
}
\`)

const acceptanceUrl = asModuleUrl(\`
import { readFileSync, writeFileSync } from 'node:fs'

const recordPath = process.env.HERMES_TEST_DRIVER_RECORD

function updateRecord(update) {
  let record = { labels: [], shortSha: null }
  try { record = JSON.parse(readFileSync(recordPath, 'utf8')) } catch {}
  update(record)
  writeFileSync(recordPath, JSON.stringify(record))
}

function fakeWindow(kind) {
  const locator = {
    click: async () => undefined,
    first: () => locator,
    isVisible: async () => true,
    or: () => locator,
    waitFor: async () => undefined,
  }
  return {
    evaluate: async (_fn, shortSha) => {
      if (kind !== 'relaunch') return 'Update complete - reopen Hermes'
      updateRecord(record => { record.shortSha = shortSha })
      return { version: 'v0.21.3', hasSha: Boolean(shortSha) }
    },
    getByRole: () => locator,
    screenshot: async () => undefined,
    title: async () => 'Aino',
    waitForTimeout: async () => undefined,
  }
}

export default {
  acceptDesktopLaunch: async app => ({
    status: { version: '0.21.3', active_sessions: 0, gateway_running: false },
    window: fakeWindow(app.kind),
  }),
  withOwnedApplication: async (_app, label, work) => {
    updateRecord(record => { record.labels.push(label) })
    return work()
  },
}
\`)

const windowInputUrl = asModuleUrl(\`
export const prepareWindowForInput = async () => undefined
\`)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@playwright/test') {
      return { shortCircuit: true, url: playwrightUrl }
    }
    if (specifier === './launch-acceptance.cjs') {
      return { shortCircuit: true, url: acceptanceUrl }
    }
    if (specifier === './window-input.cjs') {
      return { shortCircuit: true, url: windowInputUrl }
    }
    return nextResolve(specifier, context)
  },
})

const realSetTimeout = globalThis.setTimeout
globalThis.setTimeout = (callback, delay, ...args) => {
  if (delay === 20 * 60 * 1000) return { unref() {} }
  return realSetTimeout(callback, 0, ...args)
}
`
}

test('keeps the expected SHA available through update relaunch verification', () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'hermes-launch-driver-'))

  try {
    const setupPath = join(fixtureDir, 'driver-adapters.mjs')
    const specPath = join(fixtureDir, 'launch-spec.json')
    const resultPath = join(fixtureDir, 'update-result.json')
    const recordPath = join(fixtureDir, 'driver-record.json')

    writeFileSync(setupPath, adapterSetupSource())
    writeFileSync(specPath, JSON.stringify({
      argv: [process.execPath],
      cwd: fixtureDir,
      env: {},
      matchedShape: 'packaged',
    }))
    writeFileSync(resultPath, JSON.stringify({ status: 'ok' }))

    const result = spawnSync(process.execPath, [
      '--import', setupPath,
      DRIVER_PATH,
      '--spec', specPath,
      '--result', resultPath,
      '--expect-sha', EXPECTED_SHA,
      '--repo-dir', fixtureDir,
    ], {
      encoding: 'utf8',
      env: { ...process.env, HERMES_TEST_DRIVER_RECORD: recordPath },
      timeout: 30_000,
    })

    if (result.status !== 0) {
      throw new Error(
        `launch driver exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      )
    }

    expect(JSON.parse(readFileSync(recordPath, 'utf8'))).toEqual({
      labels: ['initial app teardown', 'relaunch teardown'],
      shortSha: EXPECTED_SHA.slice(0, 7),
    })
  } finally {
    rmSync(fixtureDir, { force: true, recursive: true })
  }
})
