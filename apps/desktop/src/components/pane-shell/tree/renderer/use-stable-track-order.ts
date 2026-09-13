import { useState } from 'react'

import type { LayoutNode } from '../model'

/** Move tracks with CSS, keeping chat effects and embedded documents alive. */
export function useStableTrackOrder<T extends { child: LayoutNode }>(tracks: T[]) {
  const byId = new Map(tracks.map((track, index) => [track.child.id, { ...track, index }]))
  const [ids, setIds] = useState(() => [...byId.keys()])
  const retained = ids.filter(id => byId.has(id))
  const known = new Set(retained)
  const next = [...retained, ...[...byId.keys()].filter(id => !known.has(id))]

  // Only membership changes affect DOM order. Mirroring a split keeps all
  // existing hosts in place, including hidden terminals and preview frames.
  if (next.length !== ids.length || next.some((id, index) => id !== ids[index])) {
    setIds(next)
  }

  return next.map(id => byId.get(id)!)
}
