import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

interface OfflineUpdateCheckOptions {
  userDataDir: string
  updateRoot: string
  branch: string
  now?: number
}

export function seedOfflineUpdateCheckCache({
  userDataDir,
  updateRoot,
  branch,
  now = Date.now()
}: OfflineUpdateCheckOptions) {
  const git = (args: string[]) => execFileSync('git', args, { cwd: updateRoot, encoding: 'utf8' }).trim()
  const currentSha = git(['rev-parse', 'HEAD'])
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const dirty = git(['status', '--porcelain']).length > 0

  const cached = {
    fetchedAt: now,
    currentSha,
    branch,
    status: {
      supported: true,
      branch,
      currentBranch,
      currentSha,
      dirty,
      hermesRoot: updateRoot,
      fetchedAt: now,
      error: 'offline-fixture',
      message: 'The isolated native fixture did not query remote update state.'
    }
  }

  fs.writeFileSync(path.join(userDataDir, 'updates.json'), JSON.stringify({ branch }), { mode: 0o600 })
  fs.writeFileSync(path.join(userDataDir, 'update-check-cache.json'), JSON.stringify(cached), { mode: 0o600 })

  return cached
}
