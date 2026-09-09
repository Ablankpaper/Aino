import { useStore } from '@nanostores/react'

import { Button } from '@/components/ui/button'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { triggerHaptic } from '@/lib/haptics'
import { Hash, Loader2 } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { resolveVersionStatus } from '@/lib/version-status'
import { $connection } from '@/store/session'
import { $desktopVersion, $updateApply, $updateStatus } from '@/store/updates'

interface SettingsVersionControlProps {
  onOpenAbout: () => void
}

/**
 * The client version belongs with the other system controls in Settings, not
 * in the chat status bar. Keep the same resolver as the former status-bar pill
 * so update/restart labels and commit details cannot drift between surfaces.
 */
export function SettingsVersionControl({ onOpenAbout }: SettingsVersionControlProps) {
  const { t } = useI18n()
  const copy = t.shell.statusbar
  const about = t.settings.about
  const version = useStore($desktopVersion)
  const status = useStore($updateStatus)
  const apply = useStore($updateApply)
  const connection = useStore($connection)

  const applying = apply.applying || apply.stage === 'restart'

  const resolved = resolveVersionStatus({
    applying,
    applyMessage: apply.message,
    behind: status?.behind ?? 0,
    branch: status?.branch,
    copy,
    remote: connection?.mode === 'remote',
    restarting: apply.stage === 'restart',
    sha: status?.currentSha?.slice(0, 7) ?? null,
    target: 'client',
    updateAvailable: status?.updateAvailable,
    version: version?.appVersion
  })

  const label = resolved.unknown ? about.versionUnavailable : resolved.label
  const tooltip = resolved.tooltip || label

  return (
    <Tip label={tooltip}>
      <Button
        aria-label={label}
        className={cn(
          'w-full min-w-0 justify-start text-(--ui-text-secondary) hover:text-foreground max-[47.5rem]:w-auto max-[47.5rem]:flex-none max-[47.5rem]:px-2',
          resolved.hasUpdate && 'text-primary hover:text-primary'
        )}
        data-settings-version=""
        onClick={() => {
          triggerHaptic('open')
          onOpenAbout()
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        {applying ? <Loader2 className="size-3.5 animate-spin" /> : <Hash className="size-3.5" />}
        <span className="truncate max-[47.5rem]:hidden">{label}</span>
        {resolved.detail && (
          <span className="truncate text-muted-foreground/80 max-[47.5rem]:hidden">{resolved.detail}</span>
        )}
      </Button>
    </Tip>
  )
}
