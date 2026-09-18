import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { expect, test } from 'vitest'

import { seedOfflineUpdateCheckCache } from './platform-offline-update-cache'

interface CachedUpdateCheck {
  fetchedAt: number
  currentSha: string
  branch: string
  status: Record<string, unknown> & { error?: string }
}

test('offline native cache follows its isolated branch and expires when time or checkout HEAD changes', async () => {
  // Keep the E2E TypeScript project boundary narrow while exercising the real
  // Electron cache policy through Vitest's runtime resolver.
  const updateCheck = (await import(String('../electron/update-api-check'))) as {
    cacheIsFresh(
      cached: CachedUpdateCheck,
      options: { branch: string; currentSha: string; now: number }
    ): boolean
    UPDATE_CHECK_FAILURE_TTL_MS: number
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aino-offline-update-cache-'))
  const updateRoot = path.join(root, 'checkout')
  const userDataDir = path.join(root, 'user-data')
  const now = 100_000
  const branch = 'fixture-updates'

  try {
    fs.mkdirSync(updateRoot)
    fs.mkdirSync(userDataDir)
    execFileSync('git', ['init', '--initial-branch=native'], { cwd: updateRoot })
    execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: updateRoot })
    execFileSync('git', ['config', 'user.name', 'Native Fixture'], { cwd: updateRoot })
    fs.writeFileSync(path.join(updateRoot, 'tracked.txt'), 'first\n')
    execFileSync('git', ['add', 'tracked.txt'], { cwd: updateRoot })
    execFileSync('git', ['commit', '-m', 'first'], { cwd: updateRoot })
    const firstSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: updateRoot, encoding: 'utf8' }).trim()

    seedOfflineUpdateCheckCache({ userDataDir, updateRoot, branch, now })

    const updateConfig = JSON.parse(fs.readFileSync(path.join(userDataDir, 'updates.json'), 'utf8')) as { branch: string }
    const cached = JSON.parse(fs.readFileSync(path.join(userDataDir, 'update-check-cache.json'), 'utf8')) as CachedUpdateCheck

    expect(updateConfig.branch).toBe(branch)
    expect(cached).toMatchObject({
      fetchedAt: now,
      currentSha: firstSha,
      branch,
      status: {
        supported: true,
        branch,
        currentBranch: 'native',
        currentSha: firstSha,
        dirty: false,
        hermesRoot: updateRoot,
        fetchedAt: now,
        error: 'offline-fixture'
      }
    })
    expect(cached.status).not.toHaveProperty('targetSha')
    expect(cached.status).not.toHaveProperty('updateAvailable')
    expect(updateCheck.cacheIsFresh(cached, {
      branch,
      currentSha: firstSha,
      now: now + updateCheck.UPDATE_CHECK_FAILURE_TTL_MS - 1
    })).toBe(true)
    expect(updateCheck.cacheIsFresh(cached, {
      branch,
      currentSha: firstSha,
      now: now + updateCheck.UPDATE_CHECK_FAILURE_TTL_MS
    })).toBe(false)

    fs.writeFileSync(path.join(updateRoot, 'tracked.txt'), 'second\n')
    execFileSync('git', ['commit', '-am', 'second'], { cwd: updateRoot })
    const secondSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: updateRoot, encoding: 'utf8' }).trim()

    expect(updateCheck.cacheIsFresh(cached, { branch, currentSha: secondSha, now: now + 1 })).toBe(false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
