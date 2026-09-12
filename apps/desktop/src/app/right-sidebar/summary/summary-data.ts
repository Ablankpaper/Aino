import { compactPath } from '@/lib/statusbar'
import type { PreviewArtifact } from '@/store/preview-status'
import type { ContextBreakdown, LocalHardware, UsageStats } from '@/types/hermes'

export type SummaryEnvironmentState =
  { kind: 'empty' | 'no-session' } | { cwd: string; kind: 'ready'; projectName: string }

export function summaryEnvironmentState({
  cwd,
  cwdOwner,
  projectName,
  selectedSession
}: {
  cwd: string
  cwdOwner: null | string
  projectName: null | string
  selectedSession: null | string
}): SummaryEnvironmentState {
  if (!selectedSession) {
    return { kind: 'no-session' }
  }

  const trimmedCwd = cwd.trim()

  if (!trimmedCwd || cwdOwner !== selectedSession || !projectName) {
    return { kind: 'empty' }
  }

  return { cwd: trimmedCwd, kind: 'ready', projectName }
}

export function summaryContextUsage(usage: UsageStats, breakdown: ContextBreakdown | null): UsageStats {
  if (!breakdown) {
    return usage
  }

  return {
    ...usage,
    context_estimated: usage.context_estimated ?? breakdown.context_estimated,
    context_max: usage.context_max ?? breakdown.context_max,
    context_percent: usage.context_percent ?? breakdown.context_percent,
    context_source: usage.context_source ?? breakdown.context_source,
    context_used: usage.context_used ?? breakdown.context_used
  }
}

export function formatSummaryPath(path: string): string {
  return compactPath(path)
}

export function formatHardwareBytes(bytes: number | null | undefined): string {
  return bytes != null && Number.isFinite(bytes) ? `${(bytes / 2 ** 30).toFixed(1)} GB` : '\u2014'
}

export type HardwareMeters =
  { kind: 'unavailable' } | { kind: 'ready'; ramPercent: number | null; vramPercent: number | null }

export function hardwareMeters(hardware: LocalHardware | null): HardwareMeters {
  if (!hardware) {
    return { kind: 'unavailable' }
  }

  const ramPercent =
    hardware.ram_total_bytes > 0
      ? (100 * Math.max(0, hardware.ram_total_bytes - hardware.ram_available_bytes)) / hardware.ram_total_bytes
      : null

  const vramPercent =
    hardware.vram_used_bytes != null && hardware.vram_total_bytes > 0
      ? (100 * hardware.vram_used_bytes) / hardware.vram_total_bytes
      : null

  return { kind: 'ready', ramPercent, vramPercent }
}

export function sourceItems(items: readonly PreviewArtifact[]) {
  return items.map(item => ({
    cwd: item.cwd,
    id: item.id,
    label: item.label,
    target: item.target
  }))
}
