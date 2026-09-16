import { useStore } from '@nanostores/react'
import { computed } from 'nanostores'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { platformModelCatalog } from '@/store/platform-models'
import { platformHistoryOwner } from '@/store/platform-session-access'
import { requestFreshSession } from '@/store/profile'
import { $sessionStates } from '@/store/session-states'

export function usePlatformHistoryOwner(sessionId?: string | null): string | null {
  const account = platformModelCatalog().account

  const owner = useMemo(
    () => computed([account, $sessionStates], () => platformHistoryOwner(sessionId)),
    [account, sessionId]
  )

  return useStore(owner)
}

export function PlatformHistoryNotice({ ownerUserId }: { ownerUserId: string }) {
  const { t } = useI18n()

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs text-muted-foreground" role="status">
      <span>{t.platformModels.historyReadOnly(ownerUserId)}</span>
      <Button onClick={requestFreshSession} size="sm" variant="textStrong">
        {t.platformModels.newChatCurrentAccount}
      </Button>
    </div>
  )
}
