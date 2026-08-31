import assert from 'node:assert/strict'
import { test } from 'vitest'

import { resolveProductExeName } from './after-pack.mjs'
import { buildExeVersionStrings } from './set-exe-identity.mjs'

test('Windows PE identity uses Aino while retaining upstream attribution', () => {
  assert.deepEqual(buildExeVersionStrings(), {
    ProductName: 'Aino',
    FileDescription: 'Aino',
    CompanyName: 'Nous Research',
    LegalCopyright: 'Copyright (c) 2026 Nous Research'
  })
})

test('after-pack falls back to the Aino product filename', () => {
  assert.equal(resolveProductExeName({}), 'Aino')
  assert.equal(resolveProductExeName({ packager: { appInfo: { productFilename: 'Custom' } } }), 'Custom')
})
