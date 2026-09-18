import { createRequire } from 'node:module'

import { expect, it, vi } from 'vitest'

const { launchedAppPids, diagnoseSlowMacosLaunch } = createRequire(import.meta.url)('../tests/install/e2e-assets/macos-launch-diagnostics.cjs')

it('samples only the exact app executable launched by this driver, including paths with spaces', () => {
  const executable = '/tmp/old install/Aino.app/Contents/MacOS/Aino'

  const processes = [
    ` 101 20 ${executable}`,
    ` 102 21 ${executable}`,
    ` 103 20 ${executable} Helper`,
    ' 104 20 /tmp/other/Aino.app/Contents/MacOS/Aino',
    ' 105 20 /tmp/old install/Hermes.app/Contents/MacOS/Hermes',
    ` 106 20 ${executable}`,
  ].join('\n')

  expect(launchedAppPids(processes, executable, 20)).toEqual([101, 106])
  expect(launchedAppPids(processes, executable, 22)).toEqual([])
})

it('preserves launch results and failures and cancels pending diagnostic timers', async () => {
  vi.useFakeTimers()

  try {
    const options = { executablePath: '/fixture/Aino', outputPrefix: '/fixture/log', log: vi.fn() }
    const failure = new Error('launch failed')

    await expect(diagnoseSlowMacosLaunch(async () => 'launched', options)).resolves.toBe('launched')
    await expect(diagnoseSlowMacosLaunch(async () => { throw failure }, options)).rejects.toBe(failure)
    expect(vi.getTimerCount()).toBe(0)
    expect(options.log).not.toHaveBeenCalled()
  } finally {
    vi.useRealTimers()
  }
})
