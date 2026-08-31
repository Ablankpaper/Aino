import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import { packagedBinaryCandidates, resolvePackagedBinaryPath } from './packaged-paths'

test('packaged binary candidates prefer Aino and fall back to an existing Hermes build', () => {
  const releaseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aino-packaged-paths-'))

  try {
    const candidates = packagedBinaryCandidates({
      platform: 'win32',
      arch: 'x64',
      releaseRoot
    })

    assert.match(candidates[0], /Aino\.exe$/)
    assert.match(candidates[1], /Hermes\.exe$/)

    fs.mkdirSync(path.dirname(candidates[1]), { recursive: true })
    fs.writeFileSync(candidates[1], 'legacy-build', 'utf8')

    assert.equal(resolvePackagedBinaryPath({ platform: 'win32', arch: 'x64', releaseRoot }), candidates[1])
  } finally {
    fs.rmSync(releaseRoot, { recursive: true, force: true })
  }
})
