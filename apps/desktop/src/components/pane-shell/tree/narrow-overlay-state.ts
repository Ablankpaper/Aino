import { atom } from 'nanostores'

/** The overlay currently painted by this window's narrow layout. */
export const $activeNarrowPane = atom<string | null>(null)
