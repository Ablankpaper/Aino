import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $desktopBoot } from '@/store/boot'
import { initializeConnectionsRegistry, refreshConnectionsRegistry } from '@/store/connections'
import { isAuxiliaryWindow, isPeerInstanceWindow } from '@/store/windows'

/** Registry availability belongs to the window lifecycle, not a visible picker. */
export function useConnectionRegistry(): void {
  const boot = useStore($desktopBoot)

  useEffect(() => {
    void refreshConnectionsRegistry().catch(() => undefined)

    return window.hermesDesktop?.connections?.onChanged?.(() => {
      void refreshConnectionsRegistry().catch(() => undefined)
    })
  }, [])

  useEffect(() => {
    // Restore only after primary config/session fetches settle. Other windows
    // already boot into their intended source and must keep that assignment.
    if (!boot.running && !isAuxiliaryWindow() && !isPeerInstanceWindow()) {
      void initializeConnectionsRegistry().catch(() => undefined)
    }
  }, [boot.running])
}
