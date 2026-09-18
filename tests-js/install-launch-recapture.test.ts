import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { expect, it } from 'vitest'

const { captureUpdatedDesktopLaunch } = createRequire(import.meta.url)('../tests/install/e2e-assets/desktop-artifact.cjs')

it('runs launch preparation before using the newly captured product arguments and environment', () => {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'install-recapture-')))
  const captureDir = path.join(root, 'launch-capture')
  const specPath = path.join(root, 'updated-spec.json')

  try {
    writeFileSync(path.join(root, 'desktop'), `
      const fs = require('node:fs');
      const path = require('node:path');
      require('node:assert/strict').deepEqual(process.argv.slice(2), ['--skip-build']);
      fs.writeFileSync('launch-prepared', 'yes');
      const target = process.env.HERMES_E2E_CAPTURE_LAUNCH;
      fs.writeFileSync(target, JSON.stringify({
        argv: [path.join(process.cwd(), 'apps/desktop/release/linux-unpacked/Aino')],
        cwd: process.cwd(),
        env: { ...process.env, PRODUCT_LAUNCH: 'prepared' },
        matchedShape: 'packaged',
      }));
      fs.writeFileSync(target + '.captured', 'packaged');
    `)

    const spec = captureUpdatedDesktopLaunch({
      hermesPath: process.execPath, installDir: root, captureDir, specPath,
      env: { ...process.env, HERMES_HOME: path.join(root, 'home'), PYTHONPATH: 'existing-path' },
    })

    expect(existsSync(path.join(root, 'launch-prepared'))).toBe(true)
    expect(spec.argv).toEqual([path.join(root, 'apps/desktop/release/linux-unpacked/Aino')])
    expect(spec.cwd).toBe(root)
    expect(spec.env.PRODUCT_LAUNCH).toBe('prepared')
    expect(spec.env.HERMES_HOME).toBe(path.join(root, 'home'))
    expect(spec.env.PYTHONPATH).toBe([captureDir, 'existing-path'].join(path.delimiter))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

it('rejects a successful CLI exit without a fresh captured launch or a failing launch preparation', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'install-recapture-missing-'))
  const specPath = path.join(root, 'updated-spec.json')
  const options = { hermesPath: process.execPath, installDir: root, captureDir: root, specPath, env: process.env }

  try {
    writeFileSync(specPath, JSON.stringify({ argv: ['stale-executable'] }))
    writeFileSync(`${specPath}.captured`, 'packaged')
    writeFileSync(path.join(root, 'desktop'), 'process.exit(0)')
    expect(() => captureUpdatedDesktopLaunch(options)).toThrow('no launch was captured')
    expect(existsSync(specPath)).toBe(false)
    expect(existsSync(`${specPath}.captured`)).toBe(false)
    writeFileSync(path.join(root, 'desktop'), 'process.exit(3)')
    expect(() => captureUpdatedDesktopLaunch(options)).toThrow()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
