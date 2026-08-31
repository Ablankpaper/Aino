import type { Translations } from '@/i18n'
import type { AutomationBlueprint } from '@/types/hermes'

export interface LocalizedBlueprintCopy {
  title: string
  description: string
}

/** Resolve built-in blueprint copy while preserving plugin/backend text. */
export function localizedBlueprintCopy(
  blueprint: Pick<AutomationBlueprint, 'key' | 'title' | 'description'>,
  t: Translations
): LocalizedBlueprintCopy {
  return t.cron.blueprints.catalog[blueprint.key] ?? {
    title: blueprint.title,
    description: blueprint.description
  }
}
