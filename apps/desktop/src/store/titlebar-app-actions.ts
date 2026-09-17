import { type Codec, persistentAtom } from '@/lib/persisted'

export type TitlebarAppActionsSide = 'left' | 'right'

const STORAGE_KEY = 'hermes.desktop.titlebarAppActions'

/** Layout, HUD, and haptics default to the right of the workspace title. */
export const TITLEBAR_APP_ACTIONS_DEFAULT: TitlebarAppActionsSide = 'right'

const codec: Codec<TitlebarAppActionsSide> = {
  decode: raw => (raw === 'left' || raw === 'right' ? raw : TITLEBAR_APP_ACTIONS_DEFAULT),
  encode: value => value
}

export const $titlebarAppActionsSide = persistentAtom<TitlebarAppActionsSide>(
  STORAGE_KEY,
  TITLEBAR_APP_ACTIONS_DEFAULT,
  codec
)

export function setTitlebarAppActionsSide(side: TitlebarAppActionsSide) {
  $titlebarAppActionsSide.set(side)
}

/** Sidebar and flip stay left; summary, terminal, and the right-sidebar toggle
 *  stay right. The three app actions follow `side`. */
export function titlebarAppActionsClusterCounts(
  side: TitlebarAppActionsSide,
  leftExtras = 0,
  rightExtras = 0
): { left: number; right: number } {
  const sidebar = 2
  const appActions = 3
  const rightFixed = 3

  if (side === 'left') {
    return { left: sidebar + appActions + leftExtras, right: rightFixed + rightExtras }
  }

  return { left: sidebar + leftExtras, right: appActions + rightFixed + rightExtras }
}
