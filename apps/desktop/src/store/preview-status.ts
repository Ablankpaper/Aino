import { atom } from 'nanostores'

import { previewName } from '@/lib/preview-targets'

/**
 * Session-scoped feed of previewable artifacts (HTML files, localhost dev URLs)
 * a tool produced. Surfaced as compact links in the composer status stack —
 * NOT auto-opened and NOT a bulky inline card. Click opens the rail preview or
 * the browser; both are manual.
 *
 * Fed from the tool row itself (see tool-fallback.tsx) using the same detected
 * target the inline card used, so detection parity is exact.
 */
export interface PreviewArtifact {
  /** cwd captured at detection so a relative path still resolves on click. */
  cwd: string
  /** A successful producer, not merely a file read or browser visit. */
  generated?: boolean
  /** Dedupe key + display id (the raw target). */
  id: string
  label: string
  target: string
}

const MAX_PER_SESSION = 4

export const $previewStatusBySession = atom<Record<string, PreviewArtifact[]>>({})

const writePreviews = (sid: string, items: PreviewArtifact[]) => {
  const current = $previewStatusBySession.get()

  if (items.length === 0) {
    if (!current[sid]) {
      return
    }

    const next = { ...current }
    delete next[sid]
    $previewStatusBySession.set(next)

    return
  }

  $previewStatusBySession.set({ ...current, [sid]: items })
}

/**
 * Record a detected artifact, newest last, capped. Idempotent: a target already
 * in the list keeps its slot (the tool row re-registers on every render, so this
 * must not churn the atom or reorder rows).
 */
export function recordPreviewArtifact(sid: string, target: string, cwd: string, generated = false) {
  const raw = target.trim()

  if (!sid || !raw) {
    return
  }

  const list = $previewStatusBySession.get()[sid] ?? []

  const previous = list.find(item => item.id === raw)

  if (previous) {
    if (generated && !previous.generated) {
      writePreviews(
        sid,
        list.map(item => (item === previous ? { ...item, generated: true } : item))
      )
    }

    return
  }

  writePreviews(
    sid,
    [...list, { cwd, generated, id: raw, label: previewName(raw), target: raw }].slice(-MAX_PER_SESSION)
  )
}

export function dismissPreviewArtifact(sid: string, id: string) {
  const list = $previewStatusBySession.get()[sid]

  if (list) {
    writePreviews(
      sid,
      list.filter(item => item.id !== id)
    )
  }
}

export function clearPreviewArtifacts(sid: string) {
  writePreviews(sid, [])
}
