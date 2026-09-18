import { appendFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { expect, it } from 'vitest'

const { createUpdateCompletionObserver } = createRequire(import.meta.url)('../tests/install/e2e-assets/update-completion.cjs')

it('requires fresh success and marker clearance, retaining evidence after result consumption', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'update-completion-'))

  try {
    for (const expectedSha of ['target', undefined]) {
      const home = path.join(root, expectedSha || 'result-only')
      const resultPath = path.join(home, '.hermes-update-result.json')
      const markerPath = path.join(home, '.hermes-update-in-progress')
      mkdirSync(path.join(home, 'logs'), { recursive: true })
      writeFileSync(path.join(home, 'logs/desktop.log'), '[updates] detached update finished OK (branch old)\n')
      writeFileSync(resultPath, JSON.stringify({ ok: true }))
      const observer = createUpdateCompletionObserver({ resultPath, expectedSha })

      try {
        expect(existsSync(resultPath)).toBe(false)
        expect(observer.check('target').complete).toBe(false)
        writeFileSync(markerPath, '123\n')
        writeFileSync(resultPath, '{"ok":')
        expect(observer.check('target').complete).toBe(false)
        rmSync(resultPath)
        expect(observer.check('target').complete).toBe(false)
        writeFileSync(resultPath, '\uFEFF' + JSON.stringify({ ok: true, message: 'finished' }))
        expect(observer.check('target').complete).toBe(false)
        rmSync(resultPath)
        rmSync(markerPath)

        if (expectedSha) {
          expect(observer.check('old').complete).toBe(false)
        }

        expect(observer.check('target').complete).toBe(true)
      } finally {
        observer.close()
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

it('uses only new consumed-result logs and never lets a reached SHA hide a failed update', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'update-completion-log-'))

  const messages = [
    '[updates] detached update finished OK (branch main)',
    '[updates] detached update finished with manual action (branch main): reopen',
    '[updates] detached update FAILED (exit 1): package failed',
  ]

  try {
    for (const [index, message] of messages.entries()) {
      const home = path.join(root, String(index))
      const resultPath = path.join(home, '.hermes-update-result.json')
      const logPath = path.join(home, 'logs/desktop.log')
      mkdirSync(path.dirname(logPath), { recursive: true })
      writeFileSync(logPath, messages[0] + '\n')
      const observer = createUpdateCompletionObserver({ resultPath, expectedSha: 'target' })

      try {
        expect(observer.check('target').complete).toBe(false)
        writeFileSync(resultPath, JSON.stringify({ ok: index !== 2 }))
        rmSync(resultPath)
        expect(observer.check('target').complete).toBe(false)
        appendFileSync(logPath, message)
        expect(observer.check('target').complete).toBe(false)
        appendFileSync(logPath, '\n')

        if (index === 2) {
          expect(() => observer.check('target')).toThrow('package failed')
          rmSync(logPath)
          expect(() => observer.check('target')).toThrow('package failed')
        } else {
          expect(observer.check('target').complete).toBe(true)
          writeFileSync(resultPath, JSON.stringify({ ok: false, message: 'later failure' }))
          expect(() => observer.check('target')).toThrow('later failure')
        }
      } finally {
        observer.close()
      }
    }

    const home = path.join(root, 'sha-only')
    mkdirSync(home)
    const markerPath = path.join(home, '.hermes-update-in-progress')
    const observer = createUpdateCompletionObserver({ expectedSha: 'target', hermesHome: home })

    try {
      writeFileSync(markerPath, '123\n')
      expect(observer.check('target').complete).toBe(false)
      rmSync(markerPath)
      expect(observer.check('old').complete).toBe(false)
      expect(observer.check('target').complete).toBe(true)
    } finally {
      observer.close()
    }

    expect(() => createUpdateCompletionObserver({ expectedSha: 'target' })).toThrow('HERMES_HOME')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
