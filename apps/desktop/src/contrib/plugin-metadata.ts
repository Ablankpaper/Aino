import type { Locale } from '@/i18n'

/** Optional, plugin-owned display copy for inventory/settings surfaces. */
export interface PluginLocalizedCopy {
  name?: string
  description?: string
}

/** Locale-specific plugin metadata. The base `name`/`description` remain the
 * author-supplied fallback for locales that are not declared. */
export type PluginLocalizedMetadata = Partial<Record<Locale, PluginLocalizedCopy>>

export interface PluginMetadataSource {
  name: string
  description?: string
  localized?: PluginLocalizedMetadata
}

/** Resolve explicit plugin metadata without translating arbitrary
 * user/plugin-authored strings behind the author's back. Blank overrides are
 * treated as absent so a malformed bundle cannot erase canonical copy. */
export function localizedPluginMetadata<T extends PluginMetadataSource>(
  source: T,
  locale: Locale
): { name: string; description?: string } {
  const override = source.localized?.[locale]
  const name = override?.name?.trim() || source.name
  const description = override?.description?.trim() || source.description

  return { name, ...(description ? { description } : {}) }
}
