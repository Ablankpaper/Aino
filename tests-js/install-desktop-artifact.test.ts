import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { expect, it } from 'vitest'

const resolver = path.resolve(import.meta.dirname, '../tests/install/e2e-assets/desktop-artifact.cjs')
const { refreshPackagedLaunchSpec } = createRequire(import.meta.url)(resolver)

it('resolves the installed package identity for current and historical desktop builds', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'install-artifact-'))

  const cases = [
    { platform: 'linux', config: { executableName: 'Aino' }, artifact: 'linux-unpacked/Aino', binary: 'linux-unpacked/Aino' },
    { platform: 'darwin', config: { executableName: 'Aino' }, artifact: 'mac-arm64/Aino.app', binary: 'mac-arm64/Aino.app/Contents/MacOS/Aino' },
    { platform: 'win32', config: { executableName: 'Aino' }, artifact: 'win-unpacked/Aino.exe', binary: 'win-unpacked/Aino.exe' },
    { platform: 'linux', config: {}, artifact: 'linux-unpacked/hermes', binary: 'linux-unpacked/hermes' },
    { platform: 'darwin', config: {}, artifact: 'mac/Hermes.app', binary: 'mac/Hermes.app/Contents/MacOS/Hermes' },
    { platform: 'win32', config: {}, artifact: 'win-arm64-unpacked/Hermes.exe', binary: 'win-arm64-unpacked/Hermes.exe' },
    { platform: 'darwin', config: { executableName: 'Aino', mac: { executableName: 'Aino Desktop' } }, artifact: 'mac/Aino Desktop.app', binary: 'mac/Aino Desktop.app/Contents/MacOS/Aino Desktop' },
  ]

  try {
    for (const [index, sample] of cases.entries()) {
      const install = path.join(root, String(index))
      const desktop = path.join(install, 'apps/desktop')
      const output = path.join(desktop, 'packaged')
      const binary = path.join(output, sample.binary)
      mkdirSync(path.dirname(binary), { recursive: true })
      writeFileSync(binary, 'packaged desktop', { mode: 0o755 })
      writeFileSync(path.join(desktop, 'package.json'), JSON.stringify({
        name: 'hermes', productName: 'unused metadata name',
        build: { productName: 'Hermes', directories: { output: 'packaged' }, ...sample.config },
      }))

      const artifact = spawnSync(process.execPath, [resolver, install, sample.platform], { encoding: 'utf8' })
      expect(artifact.status, artifact.stderr).toBe(0)
      expect(artifact.stdout.trim()).toBe(path.join(output, sample.artifact))
      const executable = spawnSync(process.execPath, [resolver, install, sample.platform, 'executable'], { encoding: 'utf8' })
      expect(executable.status, executable.stderr).toBe(0)
      expect(executable.stdout.trim()).toBe(binary)
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

it('rejects stale previous-brand artifacts and incomplete current-brand app bundles', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'install-artifact-stale-'))

  try {
    const desktop = path.join(root, 'apps/desktop')
    const output = path.join(desktop, 'release')
    const staleBinaries = ['linux-unpacked/hermes', 'mac-arm64/Hermes.app/Contents/MacOS/Hermes', 'win-unpacked/Hermes.exe']

    for (const relative of staleBinaries) {
      const binary = path.join(output, relative)
      mkdirSync(path.dirname(binary), { recursive: true })
      writeFileSync(binary, 'previous build', { mode: 0o755 })
    }

    mkdirSync(path.join(output, 'mac-arm64/Aino.app'), { recursive: true })

    writeFileSync(path.join(desktop, 'package.json'), JSON.stringify({
      name: 'aino', productName: 'Aino', build: { executableName: 'Aino', directories: { output: 'release' } },
    }))

    for (const platform of ['linux', 'darwin', 'win32']) {
      const result = spawnSync(process.execPath, [resolver, root, platform], { encoding: 'utf8' })
      expect(result.status).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('No packaged desktop artifact')
    }

    const oldExecutable = path.join(output, 'mac-arm64/Hermes.app/Contents/MacOS/Hermes')
    const spec = { matchedShape: 'packaged', argv: [oldExecutable, '--no-sandbox'], cwd: path.dirname(oldExecutable), env: { HERMES_HOME: '/isolated' } }
    expect(() => refreshPackagedLaunchSpec(spec, root, 'darwin')).toThrow('No packaged desktop artifact')
    const currentExecutable = path.join(output, 'mac-arm64/Aino.app/Contents/MacOS/Aino')
    mkdirSync(path.dirname(currentExecutable), { recursive: true })
    writeFileSync(currentExecutable, 'current build', { mode: 0o755 })
    expect(refreshPackagedLaunchSpec(spec, root, 'darwin')).toEqual({
      ...spec, argv: [currentExecutable, '--no-sandbox'], cwd: path.dirname(currentExecutable),
    })
    const sourceSpec = { ...spec, matchedShape: 'source', cwd: desktop }
    expect(refreshPackagedLaunchSpec(sourceSpec, root, 'darwin')).toBe(sourceSpec)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
