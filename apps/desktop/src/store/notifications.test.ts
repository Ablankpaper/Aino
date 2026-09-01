import { beforeEach, expect, test } from 'vitest'

import { setRuntimeI18nLocale } from '@/i18n'

import { $notifications, clearNotifications, isDiskFullErrorMessage, notifyError } from './notifications'

beforeEach(() => {
  setRuntimeI18nLocale('en')
  clearNotifications()
})

function lastMessage(): string {
  return $notifications.get()[0]?.message ?? ''
}

// Regression for #39365: a gateway auth 401 (bad API_SERVER_KEY) must not be
// summarized as a provider (OpenAI/OpenRouter) API key problem.
test('gateway_auth_failed error is summarized as gateway auth, not provider key', () => {
  notifyError(
    new Error(
      '401 {"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}'
    ),
    'Request failed'
  )

  expect(lastMessage()).toContain('API_SERVER_KEY')
  expect(lastMessage()).not.toMatch(/OpenAI/i)
})

test('provider invalid_api_key error still maps to the OpenAI summary', () => {
  notifyError(
    new Error('401 {"error": {"message": "Incorrect API key provided", "code": "invalid_api_key"}}'),
    'Request failed'
  )

  expect(lastMessage()).toMatch(/OpenAI rejected the API key/i)
})

test('disk-full / ENOSPC errors toast a free-space message', () => {
  expect(isDiskFullErrorMessage('OSError: [Errno 28] No space left on device')).toBe(true)
  expect(isDiskFullErrorMessage('sqlite3.OperationalError: database or disk is full')).toBe(true)
  expect(isDiskFullErrorMessage('disk full: session storage could not be written — free some disk space')).toBe(true)
  expect(isDiskFullErrorMessage('This is often a full disk — free some space')).toBe(true)
  expect(isDiskFullErrorMessage('session storage could not be written: permission denied')).toBe(false)
  expect(isDiskFullErrorMessage('network timeout')).toBe(false)

  notifyError(new Error('OSError: [Errno 28] No space left on device: state.db'), 'Prompt failed')

  expect(lastMessage()).toMatch(/Disk full/i)
  expect(lastMessage()).toMatch(/free some space/i)
})

test('session storage write failure is treated as disk-full class', () => {
  notifyError(
    new Error('disk full: session storage could not be written — free some disk space and try again'),
    'Prompt failed'
  )

  expect(lastMessage()).toMatch(/Disk full/i)
})

test('fixed desktop log bridge errors use Simplified Chinese copy', () => {
  setRuntimeI18nLocale('zh')

  notifyError(new Error('logs root unavailable'), '无法打开日志文件夹')
  expect(lastMessage()).toBe('无法打开日志文件夹')
  expect($notifications.get()[0]?.detail).toBeUndefined()

  notifyError(new Error('open failed'), '无法打开日志文件夹')
  expect(lastMessage()).toBe('无法打开日志文件夹')
  expect($notifications.get()[0]?.detail).toBeUndefined()
})

test('fixed desktop download bridge errors do not leak an English implementation detail', () => {
  setRuntimeI18nLocale('zh')

  notifyError(new Error('Desktop file download bridge is unavailable'), '文件下载失败')

  expect(lastMessage()).toBe('桌面文件下载桥不可用')
  expect($notifications.get()[0]?.detail).toBeUndefined()
})

test('fixed gateway-unavailable errors use Simplified Chinese copy', () => {
  setRuntimeI18nLocale('zh')

  notifyError(new Error('Hermes gateway unavailable for profile "work"'), '连接失败')
  expect(lastMessage()).toBe('Aino 网关未连接')

  notifyError(new Error('Gateway not connected'), '连接失败')
  expect(lastMessage()).toBe('Aino 网关未连接')
})

test('image HTTP failures keep the status while using Simplified Chinese copy', () => {
  setRuntimeI18nLocale('zh')

  notifyError(new Error('Could not fetch image: 404'), '图片下载失败')

  expect(lastMessage()).toBe('无法获取图片（HTTP 404）。')
  expect($notifications.get()[0]?.detail).toBe('Could not fetch image: 404')
})

test('session hydration timeouts use the localized recovery summary and retain diagnostics', () => {
  setRuntimeI18nLocale('zh')

  const raw = "Timed out loading medicina's session history."

  notifyError(new Error(raw), '机器人聊天打开失败')

  expect(lastMessage()).toBe('与此会话的连接失败，自动重试已停止。请确认网关正在运行，然后重试。')
  expect($notifications.get()[0]?.detail).toBe(raw)
})

test('spawn failures use a localized generic summary', () => {
  setRuntimeI18nLocale('zh')

  notifyError(new Error('spawn failed'), '无法启动操作')

  expect(lastMessage()).toBe('无法启动后台操作。')
  expect($notifications.get()[0]?.detail).toBeUndefined()
})
