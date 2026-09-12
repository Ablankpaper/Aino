import { compactPath } from '@/lib/statusbar'
import type { PreviewArtifact } from '@/store/preview-status'
import type { LocalHardware } from '@/types/hermes'

export type SummaryEnvironmentState = { kind: 'empty' | 'no-session' } | { cwd: string; kind: 'ready' }

export function summaryEnvironmentState({
  cwd,
  cwdOwner,
  selectedSession
}: {
  cwd: string
  cwdOwner: null | string
  selectedSession: null | string
}): SummaryEnvironmentState {
  if (!selectedSession) {
    return { kind: 'no-session' }
  }

  const trimmedCwd = cwd.trim()

  if (!trimmedCwd || cwdOwner !== selectedSession) {
    return { kind: 'empty' }
  }

  return { cwd: trimmedCwd, kind: 'ready' }
}

export function formatSummaryPath(path: string): string {
  return compactPath(path)
}

export function formatHardwareBytes(bytes: number | null | undefined): string {
  return bytes != null && Number.isFinite(bytes) ? `${(bytes / 2 ** 30).toFixed(1)} GB` : '\u2014'
}

export type HardwareMeters =
  | { kind: 'unavailable' }
  | { kind: 'ready'; ramPercent: number | null; vramPercent: number | null }

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
