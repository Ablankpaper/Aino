import { useStore } from '@nanostores/react'

import { useAccountActions } from '@/app/account/account-context'
import sidebarEmptyIcon from '@/assets/aino-home/sidebar-empty.svg'
import sidebarSettingsIcon from '@/assets/aino-home/sidebar-settings.svg'
import { AinoDesignIcon } from '@/components/aino-design-icon'
import { AvatarChip } from '@/components/ui/avatar-chip'
import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Skeleton } from '@/components/ui/skeleton'
import { OverflowTip, Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

import { SidebarRowCluster, SidebarRowShell, SidebarRowStack } from './chrome'

// Stands in for session rows, so it borrows their chrome instead of copying
// the grid — a placeholder on a different edge than the rows it resolves into
// makes the list step sideways on load.
export function SidebarSessionSkeletons() {
  return (
    <SidebarRowStack aria-hidden="true">
      {['w-32', 'w-40', 'w-28', 'w-36', 'w-24'].map((width, i) => (
        <SidebarRowShell actions={<Skeleton className="size-3.5 rounded-sm opacity-60" />} key={`${width}-${i}`}>
          <SidebarRowCluster>
            <Skeleton className={cn('h-3 rounded-sm', width)} />
          </SidebarRowCluster>
        </SidebarRowShell>
      ))}
    </SidebarRowStack>
  )
}

export function SidebarBlankState({ onNewProject }: { onNewProject: () => void }) {
  const { t } = useI18n()
  const s = t.sidebar

  return (
    <div className="grid min-h-0 flex-1 place-items-center px-4 pb-44 text-center" data-slot="sidebar-blank-state">
      <div className="flex flex-col items-center gap-1.5">
        <AinoDesignIcon className="size-6 text-(--aino-landing-placeholder)" src={sidebarEmptyIcon} />
        <p className="text-xs text-(--aino-landing-muted)">{s.noSessions}</p>
        <div className="flex h-[18px] w-[58px] items-start justify-center pt-0.5">
          <Button
            className="text-xs font-normal text-(--aino-landing-muted)"
            onClick={onNewProject}
            size="inline"
            variant="ghost"
          >
            {'+' + ' ' + s.projects.newButton}
          </Button>
        </div>
      </div>
    </div>
  )
}

function identityInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)

  if (parts.length > 1) {
    return `${Array.from(parts[0])[0] ?? ''}${Array.from(parts.at(-1) ?? '')[0] ?? ''}`.toUpperCase()
  }

  return Array.from(parts[0] ?? '?')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface SidebarIdentityFooterProps {
  onOpenAccount: () => void
  onOpenSettings: () => void
  settingsLabel: string
}

export function SidebarIdentityFooter({ onOpenAccount, onOpenSettings, settingsLabel }: SidebarIdentityFooterProps) {
  const { t } = useI18n()
  const actions = useAccountActions()
  const { account } = useStore(actions.state)
  const label = account?.display_name.trim() || account?.identifier.trim() || t.settings.account.title

  return (
    <footer
      className="flex shrink-0 items-center gap-1 border-t border-(--aino-landing-stroke) p-2"
      data-slot="sidebar-identity-footer"
    >
      <Button
        aria-label={`${t.settings.account.title} · ${label}`}
        className="min-w-0 flex-1 justify-start gap-2.5 text-(--aino-landing-primary)"
        onClick={onOpenAccount}
        size="sm"
        type="button"
        variant="ghost"
      >
        <AvatarChip
          aria-hidden="true"
          className="size-7 rounded-full bg-(--aino-action-bg) text-(--aino-action-fg)"
          name={label}
        >
          {identityInitials(label)}
        </AvatarChip>
        <OverflowTip label={label}>
          <span className="min-w-0 truncate">{label}</span>
        </OverflowTip>
      </Button>
      <Tip label={settingsLabel}>
        <Button
          aria-label={settingsLabel}
          className="text-(--aino-landing-muted)"
          onClick={onOpenSettings}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <AinoDesignIcon className="size-3.5" src={sidebarSettingsIcon} />
        </Button>
      </Tip>
    </footer>
  )
}

export function SidebarPinnedEmptyState() {
  const { t } = useI18n()

  return (
    <div
      className="flex min-h-7 items-center gap-1.5 rounded-lg pl-2 text-[0.75rem] text-(--ui-text-tertiary)"
      data-sidebar-pinned-hint=""
    >
      <span className="grid w-3.5 shrink-0 place-items-center text-(--ui-text-quaternary)">
        <Codicon name="pin" size="0.75rem" />
      </span>
      <span>{t.sidebar.shiftClickHint}</span>
    </div>
  )
}

// A failed drill-in load must not share the "no sessions yet" copy — that
// reads as data loss. Borrows the row chrome so it resolves into the rows it
// replaces without the list stepping sideways.
export function SidebarLoadErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()

  return (
    <div className="grid min-h-16 place-items-center rounded-lg px-2 text-center">
      <div className="flex flex-col items-center gap-2">
        <Codicon className="text-(--ui-text-quaternary)" name="error" size="1rem" />
        <p className="text-xs text-(--ui-text-tertiary)">{t.sidebar.projectLoadFailed}</p>
        <Button className="mt-0.5 text-(--ui-text-secondary)" onClick={onRetry} size="sm" variant="ghost">
          <Codicon name="refresh" size="0.75rem" />
          {t.common.retry}
        </Button>
      </div>
    </div>
  )
}
