/** Compatibility entry for plugins; Aino Desktop only accepts its fixed palette. */

import { $pendingSkinApply } from './backend-sync'
import { DEFAULT_SKIN_NAME } from './presets'

/** Return false for unsupported palettes without changing the appearance. */
export function requestTheme(name: string): boolean {
  if (name !== DEFAULT_SKIN_NAME) {
    return false
  }

  $pendingSkinApply.set(name)

  return true
}
