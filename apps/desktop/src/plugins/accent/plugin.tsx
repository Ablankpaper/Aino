/**
 * Accent — pick the theme's accent color and watch the whole app retint live.
 *
 * The COLOR MATH is not here. `themes/retint.ts` owns re-seeding a palette from
 * one color, and it works on any theme with any accent; this plugin is only the
 * control surface for it. That split is deliberate: the retint is core behavior
 * that Appearance settings and ⌘K should be able to drive too, while the
 * statusbar picker is an authoring tool most users never need.
 *
 * Ships OFF (`defaultEnabled: false`): it inventories in Settings ▸ Plugins and
 * registers nothing until the switch is flipped. With it off, `$accentOverride`
 * stays null and `retintTheme` is never called — themes paint exactly as
 * authored.
 */

import type { HermesPlugin, PaletteContribution, PluginContext } from '@hermes/plugin-sdk'
import { $accentOverride, PALETTE_AREA, setAccentOverride, STATUSBAR_AREAS } from '@hermes/plugin-sdk'

import { ACCENT_LOCALES } from './i18n'
import { AccentPickerTrigger } from './picker'

/** Keep palette labels readable on hosts that predate this plugin's locale
 * bundle. The i18n resolver returns the raw key in that compatibility case. */
function pluginText(ctx: PluginContext, key: string, fallback: string, ...args: unknown[]): string {
  const translated = ctx.i18n?.t?.(key, ...args)

  return translated && translated !== key ? translated : fallback
}

const plugin: HermesPlugin = {
  id: 'accent',
  name: 'Accent Picker',
  description:
    'Pick the theme accent from an OKLCH color picker in the status bar; the palette re-derives live. Authoring tool — the color is not persisted.',
  localized: {
    zh: {
      name: '强调色选择器',
      description: '从状态栏选择主题强调色，调色板会实时更新。此工具用于主题创作，颜色不会保存。'
    },
    'zh-hant': {
      name: '強調色選擇器',
      description: '從狀態列選擇主題強調色，調色板會即時更新。此工具用於主題創作，顏色不會保存。'
    },
    ja: {
      name: 'アクセントカラー選択',
      description:
        'ステータスバーからテーマのアクセントを選び、配色をリアルタイムで再生成します。作成用ツールで、色は保存されません。'
    }
  },
  defaultEnabled: false,
  register(ctx) {
    ctx.i18n.register(ACCENT_LOCALES)

    // The override is a scratch value, not a setting. Dropping it on unregister
    // means disabling the plugin (or reloading) returns every surface to the
    // authored theme instead of stranding a color with no control to clear it.
    ctx.onDispose(() => setAccentOverride(null))

    ctx.registerMany([
      {
        id: 'picker',
        area: STATUSBAR_AREAS.right,
        order: 90,
        render: () => <AccentPickerTrigger />
      },
      {
        id: 'reset',
        area: PALETTE_AREA,
        data: {
          id: 'accent.reset',
          label: pluginText(ctx, 'resetCommand', 'Accent: reset to the theme default'),
          keywords: ['accent', 'color', 'theme', 'reset', 'default'],
          run: () => setAccentOverride(null)
        } satisfies PaletteContribution
      },
      {
        id: 'copy',
        area: PALETTE_AREA,
        data: {
          id: 'accent.copy',
          label: pluginText(ctx, 'copyCommand', 'Accent: copy the current color'),
          keywords: ['accent', 'color', 'hex', 'copy', 'clipboard'],
          run: () => {
            const hex = $accentOverride.get()

            if (hex) {
              void navigator.clipboard?.writeText(hex)
            }
          }
        } satisfies PaletteContribution
      }
    ])
  }
}

export default plugin
