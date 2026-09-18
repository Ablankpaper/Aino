import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

const DRIVER_PATH = fileURLToPath(new URL(
  '../../../tests/install/e2e-assets/launch-from-spec.mjs',
  import.meta.url,
))

function adapterSetupSource() {
  return `
import { registerHooks } from 'node:module'

const asModuleUrl = source =>
  \`data:text/javascript;base64,\${Buffer.from(source).toString('base64')}\`

const playwrightUrl = asModuleUrl(\`
import { readFileSync, writeFileSync } from 'node:fs'

let launches = 0
export const _electron = {
  launch: async options => {
    const kind = launches++ === 0 ? 'initial' : 'relaunch'
    const record = JSON.parse(readFileSync(process.env.HERMES_TEST_DRIVER_RECORD, 'utf8'))
    record.launches.push({ executablePath: options.executablePath, home: options.env.HERMES_HOME })
    writeFileSync(process.env.HERMES_TEST_DRIVER_RECORD, JSON.stringify(record))
    return { kind, windows: () => [kind] }
  },
}
\`)

const acceptanceUrl = asModuleUrl(\`
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const recordPath = process.env.HERMES_TEST_DRIVER_RECORD

function updateRecord(update) {
  const record = JSON.parse(readFileSync(recordPath, 'utf8'))
  update(record)
  writeFileSync(recordPath, JSON.stringify(record))
}

function fakeWindow(kind) {
  const completeUpdate = async () => {
    const home = process.env.HERMES_HOME
    const repo = process.env.HERMES_TEST_DRIVER_REPO
    const resultPath = join(home, '.hermes-update-result.json')
    assert.equal(existsSync(resultPath), false, 'observer must discard the stale receipt before the click')
    assert.notEqual(execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), process.env.HERMES_TEST_EXPECTED_SHA)
    writeFileSync(join(home, '.hermes-update-in-progress'), 'fixture update')
    execFileSync('git', ['-C', repo, 'update-ref', 'HEAD', process.env.HERMES_TEST_EXPECTED_SHA])
    writeFileSync(resultPath, JSON.stringify({ ok: true, message: 'fresh fixture update' }))
    rmSync(join(home, '.hermes-update-in-progress'))
    updateRecord(record => { record.staleReceiptRemoved = true })
  }
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
    getByRole: (_role, query) => query.name.test('Update now')
      ? { first: () => ({ ...locator, click: completeUpdate }) }
      : locator,
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
    const hermesHome = join(fixtureDir, 'home')
    const resultPath = join(hermesHome, '.hermes-update-result.json')
    const recordPath = join(fixtureDir, 'driver-record.json')
    const desktopDir = join(fixtureDir, 'apps', 'desktop')

    const artifactPaths: Record<string, string> = {
      darwin: 'mac-arm64/Aino.app/Contents/MacOS/Aino',
      linux: 'linux-unpacked/Aino',
      win32: 'win-unpacked/Aino.exe',
    }

    const executablePath = join(desktopDir, 'release', artifactPaths[process.platform])

    const git = (...args: string[]) => execFileSync('git', [
      '-C', fixtureDir, '-c', 'user.name=Launch fixture',
      '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
      '-c', `core.hooksPath=${join(fixtureDir, 'empty-hooks')}`, ...args,
    ], { encoding: 'utf8' }).trim()

    git('init', '--quiet')
    git('commit', '--quiet', '--allow-empty', '-m', 'before update')
    const oldSha = git('rev-parse', 'HEAD')
    git('commit', '--quiet', '--allow-empty', '-m', 'after update')
    const expectedSha = git('rev-parse', 'HEAD')
    git('update-ref', 'HEAD', oldSha)

    mkdirSync(hermesHome)
    mkdirSync(dirname(executablePath), { recursive: true })
    writeFileSync(executablePath, 'fixture executable', { mode: 0o755 })
    writeFileSync(join(desktopDir, 'package.json'), JSON.stringify({
      name: 'aino', build: { executableName: 'Aino', directories: { output: 'release' } },
    }))

    const spec = {
      argv: [process.execPath],
      cwd: fixtureDir,
      env: { PATH: process.env.PATH ?? dirname(process.execPath), HERMES_HOME: hermesHome },
      matchedShape: 'packaged',
    }

    const updatedSpecPath = join(fixtureDir, 'prepared-launch-spec.json')
    writeFileSync(updatedSpecPath, JSON.stringify({ ...spec, argv: [executablePath] }))
    // On Linux the driver re-runs the installed CLI before launching the rebuilt app.
    mkdirSync(join(fixtureDir, 'venv', 'bin'), { recursive: true })
    writeFileSync(join(fixtureDir, 'venv', 'bin', 'hermes'), `#!/usr/bin/env node
const assert = require('node:assert/strict')
const fs = require('node:fs')
assert.deepEqual(process.argv.slice(2), ['desktop', '--skip-build'])
fs.copyFileSync(${JSON.stringify(updatedSpecPath)}, process.env.HERMES_E2E_CAPTURE_LAUNCH)
fs.writeFileSync(process.env.HERMES_E2E_CAPTURE_LAUNCH + '.captured', 'packaged')
`, { mode: 0o755 })

    writeFileSync(setupPath, adapterSetupSource())
    writeFileSync(specPath, JSON.stringify(spec))
    writeFileSync(resultPath, JSON.stringify({ ok: true, message: 'stale receipt' }))
    writeFileSync(recordPath, JSON.stringify({
      labels: [], shortSha: null, launches: [], staleReceiptRemoved: false,
    }))

    const result = spawnSync(process.execPath, [
      '--import', setupPath,
      DRIVER_PATH,
      '--spec', specPath,
      '--result', resultPath,
      '--expect-sha', expectedSha,
      '--repo-dir', fixtureDir,
      '--launch-capture-dir', fixtureDir,
      '--timeout-ms', '2000',
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        HERMES_HOME: hermesHome,
        HERMES_TEST_DRIVER_RECORD: recordPath,
        HERMES_TEST_DRIVER_REPO: fixtureDir,
        HERMES_TEST_EXPECTED_SHA: expectedSha,
      },
      timeout: 30_000,
    })

    if (result.status !== 0) {
      throw new Error(
        `launch driver exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      )
    }

    expect(JSON.parse(readFileSync(recordPath, 'utf8'))).toEqual({
      labels: ['initial app teardown', 'relaunch teardown'],
      shortSha: expectedSha.slice(0, 7),
      launches: [
        { executablePath: process.execPath, home: hermesHome },
        { executablePath, home: hermesHome },
      ],
      staleReceiptRemoved: true,
    })
    expect(git('rev-parse', 'HEAD')).toBe(expectedSha)
  } finally {
    rmSync(fixtureDir, { force: true, recursive: true })
  }
})
