import { collectArtifactsForSession } from '@/app/artifacts/artifact-utils'
import { hermesDirectiveFormatter } from '@/components/assistant-ui/directive-text'
import { extractSearchResults, parseMaybeObject } from '@/components/assistant-ui/tool/fallback-model'
import { translateNow } from '@/i18n'
import { type ChatMessage, chatMessageText, toChatMessages } from '@/lib/chat-messages'
import { previewName } from '@/lib/preview-targets'
import type { ArtifactRecord } from '@/store/artifacts'
import type { PreviewArtifact } from '@/store/preview-status'
import type { SessionMessage } from '@/types/hermes'

import { type SummaryActivity, summaryHistoryActivity, summaryToolResult } from './session-activity'

export interface SummaryResource {
  artifactId?: string
  cwd?: string
  id: string
  kind: 'file' | 'folder' | 'image' | 'skill' | 'tool' | 'url'
  label: string
  target: string
}

export interface SummarySessionContent extends SummaryActivity {
  outputs: SummaryResource[]
  sources: SummaryResource[]
}

export const EMPTY_SUMMARY_CONTENT: SummarySessionContent = { delegations: [], outputs: [], sources: [], todos: [] }

function resourceKind(target: string): SummaryResource['kind'] {
  if (/\.(?:png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(target) || target.startsWith('data:image/')) {
    return 'image'
  }

  return /^https?:\/\//i.test(target) ? 'url' : 'file'
}

export function uniqueSummaryResources(items: readonly SummaryResource[]): SummaryResource[] {
  const unique = new Map<string, SummaryResource>()

  for (const item of items) {
    const key = `${item.kind === 'tool' || item.kind === 'skill' ? item.kind : 'resource'}:${item.target}`

    if (!unique.has(key)) {
      unique.set(key, item)
    }
  }

  return [...unique.values()]
}

/** Sources describe supplied context and services used, never generated files. */
export function summarySources(messages: readonly ChatMessage[]): SummaryResource[] {
  const sources: SummaryResource[] = []

  for (const message of messages) {
    if (message.hidden) {
      continue
    }

    if (message.role === 'user') {
      const text = [chatMessageText(message), ...(message.attachmentRefs ?? [])].join('\n')

      for (const ref of hermesDirectiveFormatter.parse(text)) {
        if (ref.kind !== 'mention' || !['file', 'folder', 'image', 'url', 'tool', 'skill'].includes(ref.type)) {
          continue
        }

        const label =
          ref.label === ref.id && ['file', 'folder', 'image'].includes(ref.type) ? previewName(ref.id) : ref.label

        sources.push({ id: `${ref.type}:${ref.id}`, kind: ref.type as SummaryResource['kind'], label, target: ref.id })
      }

      for (const part of message.parts) {
        if (part.type === 'image') {
          sources.push({
            id: part.image,
            kind: 'image',
            label: part.image.startsWith('data:') ? translateNow('summary.sources.image') : previewName(part.image),
            target: part.image
          })
        }
      }

      // Pasted URLs are useful sources even when no @url chip was inserted.
      for (const match of text.matchAll(/https?:\/\/[^\s<>"'`\])]+/g)) {
        const target = match[0].replace(/[.,;!?]+$/, '')
        sources.push({ id: target, kind: 'url', label: target, target })
      }
    }

    for (const part of message.parts) {
      if (part.type !== 'tool-call' || part.result === undefined) {
        continue
      }

      const server = /^mcp__([^_].*?)__/.exec(part.toolName)?.[1]

      if (server) {
        sources.push({ id: `mcp:${server}`, kind: 'tool', label: server, target: server })
      }

      if (part.toolName === 'skill_view' && !part.isError) {
        const args = parseMaybeObject(part.args)

        if (typeof args.name === 'string') {
          sources.push({ id: `skill:${args.name}`, kind: 'skill', label: args.name, target: args.name })
        }
      }

      if ((part.toolName === 'web_search' || part.toolName === 'web_extract') && !part.isError) {
        for (const hit of extractSearchResults(summaryToolResult(part.result), Infinity)) {
          if (/^https?:\/\//i.test(hit.url)) {
            sources.push({ id: hit.url, kind: 'url', label: hit.title || hit.url, target: hit.url })
          }
        }
      }
    }
  }

  return uniqueSummaryResources(sources)
}

/** Reuse the artifact page's durable extraction, including pre-compression history. */
export function summaryHistoryContent(sessionId: string, messages: SessionMessage[]): SummarySessionContent {
  const session = { id: sessionId, last_active: 0, started_at: 0, preview: null, title: null }
  const visibleMessages = messages.filter(message => message.display_kind !== 'hidden')
  const chatMessages = toChatMessages(visibleMessages)
  const candidates = collectArtifactsForSession(session, visibleMessages)

  const produced = new Set(
    collectArtifactsForSession(session, visibleMessages, { generatedOnly: true }).map(item => item.value)
  )

  const inputs = summarySources(chatMessages)
  // References have the same semantics for local files, images and URLs.
  // Only explicit media delivery or producer results establish an output.
  const references = candidates.filter(item => !produced.has(item.value))
  const outputs = candidates.filter(item => produced.has(item.value))

  const resource = (item: (typeof candidates)[number]): SummaryResource => ({
    id: item.id,
    kind: resourceKind(item.value),
    label: item.label,
    target: item.value
  })

  return {
    ...summaryHistoryActivity(chatMessages, messages),
    outputs: outputs.map(resource),
    sources: uniqueSummaryResources([...inputs, ...references.map(resource)])
  }
}

export function summaryOutputs(
  history: readonly SummaryResource[],
  artifacts: readonly ArtifactRecord[],
  previews: readonly PreviewArtifact[]
): SummaryResource[] {
  const generatedTargets = new Set(history.map(item => item.target))

  return uniqueSummaryResources([
    ...artifacts.map(item => ({
      artifactId: item.id,
      id: item.id,
      kind: 'file' as const,
      label: item.title,
      target: `artifact:${item.id}`
    })),
    ...previews
      .filter(item => item.generated || generatedTargets.has(item.target))
      .map(item => ({ ...item, kind: resourceKind(item.target) })),
    ...history
  ])
}

export function summaryPreviewSources(
  previews: readonly PreviewArtifact[],
  outputs: readonly SummaryResource[]
): SummaryResource[] {
  const outputTargets = new Set(outputs.map(item => item.target))

  return previews
    .filter(item => !outputTargets.has(item.target))
    .map(item => ({ ...item, kind: resourceKind(item.target) }))
}
