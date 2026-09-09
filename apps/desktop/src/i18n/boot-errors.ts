import type { Translations } from './types'

const DESKTOP_BOOT_FAILURE = /^Desktop boot failed: ?([\s\S]*)$/

const BACKEND_START_FAILURE = /^(?:Aino|Hermes) backend(?: for profile "([^"]*)")? failed to start: ?([\s\S]*)$/

const BACKEND_EXIT_FAILURE =
  /^(?:Aino|Hermes) backend(?: for profile "([^"]*)")? exited before it became ready \(([^)]*)\)([\s\S]*)$/

// The catalog applies the product-brand overlay to the result of every
// translation function. Pass opaque sentinels for dynamic diagnostics so a
// traceback containing the word "Hermes" is restored byte-for-byte after the
// fixed prefix has been translated.
const DETAIL_TOKEN = '\u0000AINO_BOOT_DETAIL\u0000'
const PROFILE_TOKEN = '\u0000AINO_BOOT_PROFILE\u0000'
const STATUS_TOKEN = '\u0000AINO_BOOT_STATUS\u0000'
const SUFFIX_TOKEN = '\u0000AINO_BOOT_SUFFIX\u0000'

function errorMessage(error: unknown): string {
  if (error === null || error === undefined) {
    return ''
  }

  return error instanceof Error ? error.message : typeof error === 'string' ? error : String(error)
}

function restore(template: string, replacements: Array<readonly [string, string]>): string {
  return replacements.reduce((result, [token, value]) => result.replaceAll(token, value), template)
}

/**
 * Translate only fixed boot-status prefixes emitted by the Electron shell.
 * Backend diagnostics (paths, exit output, URLs, and server messages) are
 * passed to the locale formatter untouched so they remain useful for repair.
 */
export function localizedBootFailureError(translations: Translations, error: unknown): string {
  const message = errorMessage(error)

  const desktopFailure = message.match(DESKTOP_BOOT_FAILURE)

  if (desktopFailure) {
    return restore(translations.boot.desktopBootFailedWithMessage(DETAIL_TOKEN), [[DETAIL_TOKEN, desktopFailure[1]]])
  }

  const backendStartFailure = message.match(BACKEND_START_FAILURE)

  if (backendStartFailure) {
    return restore(
      translations.boot.failure.backendStartFailed(
        DETAIL_TOKEN,
        backendStartFailure[1] === undefined ? undefined : PROFILE_TOKEN
      ),
      [
        [PROFILE_TOKEN, backendStartFailure[1] ?? ''],
        [DETAIL_TOKEN, backendStartFailure[2]]
      ]
    )
  }

  const backendExitFailure = message.match(BACKEND_EXIT_FAILURE)

  if (backendExitFailure) {
    const suffix = backendExitFailure[3]
    const suffixToken = suffix.startsWith('.') ? `.${SUFFIX_TOKEN}` : SUFFIX_TOKEN

    return restore(
      translations.boot.failure.backendExitedBeforeReady(
        STATUS_TOKEN,
        suffixToken,
        backendExitFailure[1] === undefined ? undefined : PROFILE_TOKEN
      ),
      [
        [PROFILE_TOKEN, backendExitFailure[1] ?? ''],
        [STATUS_TOKEN, backendExitFailure[2]],
        [SUFFIX_TOKEN, suffix.startsWith('.') ? suffix.slice(1) : suffix]
      ]
    )
  }

  return message
}
