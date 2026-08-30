import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  APP_ID,
  defaultAgentHomePath,
  defaultUserDataPath,
  HOME_DIR_NAME,
  PRIMARY_PROTOCOL,
  PRODUCT_NAME,
  REPOSITORY_SSH_URL
} from './product-identity'

test('Aino product identity is stable across desktop entry points', () => {
  assert.equal(PRODUCT_NAME, 'Aino')
  assert.equal(APP_ID, 'com.ablankpaper.aino')
  assert.equal(HOME_DIR_NAME, 'aino')
  assert.equal(PRIMARY_PROTOCOL, 'aino')
  assert.equal(REPOSITORY_SSH_URL, 'git@github.com:Ablankpaper/Aino.git')
})

test('default agent home is isolated from the Hermes home on POSIX', () => {
  assert.equal(defaultAgentHomePath({ platform: 'darwin', homeDir: '/Users/demo' }), '/Users/demo/.aino')
  assert.equal(defaultAgentHomePath({ platform: 'linux', homeDir: '/home/demo' }), '/home/demo/.aino')
})

test('default agent home is isolated under LOCALAPPDATA on Windows', () => {
  assert.equal(
    defaultAgentHomePath({
      platform: 'win32',
      homeDir: 'C:\\Users\\demo',
      localAppData: 'C:\\Users\\demo\\AppData\\Local'
    }),
    'C:\\Users\\demo\\AppData\\Local\\aino'
  )
})

test('default Electron userData is product-scoped', () => {
  assert.equal(
    defaultUserDataPath('/Users/demo/Library/Application Support'),
    '/Users/demo/Library/Application Support/Aino'
  )
})
