import assert from 'node:assert/strict'
import { test } from 'vitest'

import { resolveProductExeName } from './after-pack.mjs'
import { buildExeVersionStrings } from './set-exe-identity.mjs'

test('Windows PE identity is fully private-branded for Aino', () => {
  assert.deepEqual(buildExeVersionStrings(), {
    ProductName: 'Aino',
    FileDescription: 'Aino',
    CompanyName: 'Ablankpaper',
    LegalCopyright: 'Copyright (c) 2026 Ablankpaper'
  })
})

test('after-pack falls back to the Aino product filename', () => {
  assert.equal(resolveProductExeName({}), 'Aino')
  assert.equal(resolveProductExeName({ packager: { appInfo: { productFilename: 'Custom' } } }), 'Custom')
})
