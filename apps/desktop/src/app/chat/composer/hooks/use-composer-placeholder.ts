import { useEffect, useRef, useState } from 'react'

import { useI18n } from '@/i18n'
import { resetBrowseState } from '@/store/composer-input-history'

import { pickPlaceholder } from '../composer-utils'

interface UseComposerPlaceholderOptions {
  disabled: boolean
  reconnecting: boolean
  sessionId: null | string | undefined
}

/**
 * The composer's placeholder text. A resting starter (new session) / continuation
 * (existing session) is picked once and only re-rolled when we genuinely move to
 * a *different* conversation — the null→id persist of a freshly-started session
 * keeps its starter so the text doesn't flip mid-stream. A late locale resolve
 * re-rolls the same session pool so a separate renderer (such as HUD) does not
 * keep its initial English copy. While the transport is down, it swaps to a
 * reconnecting / starting message instead.
 */
export function useComposerPlaceholder({ disabled, reconnecting, sessionId }: UseComposerPlaceholderOptions): string {
  const { locale, t } = useI18n()
  const newSessionPlaceholders = t.composer.newSessionPlaceholders
  const followUpPlaceholders = t.composer.followUpPlaceholders

  const [restingPlaceholder, setRestingPlaceholder] = useState(() =>
    pickPlaceholder(sessionId ? followUpPlaceholders : newSessionPlaceholders)
  )

  const prevSessionIdRef = useRef(sessionId)
  const prevLocaleRef = useRef(locale)

  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    const prev = prevSessionIdRef.current
    const localeChanged = prevLocaleRef.current !== locale
    const sessionChanged = prev !== sessionId

    prevSessionIdRef.current = sessionId
    prevLocaleRef.current = locale

    if (!sessionChanged && !localeChanged) {
      return
    }

    // null → id: the new session we're already in just got persisted. Keep the
    // starter we showed instead of swapping to a follow-up under the user.
    if (prev == null && sessionId) {
      if (localeChanged) {
        setRestingPlaceholder(pickPlaceholder(newSessionPlaceholders))
      }

      return
    }

    if (sessionChanged) {
      resetBrowseState(prev)
    }

    setRestingPlaceholder(pickPlaceholder(sessionId ? followUpPlaceholders : newSessionPlaceholders))
  }, [followUpPlaceholders, locale, newSessionPlaceholders, sessionId])

  // When the transport is disabled it's because the gateway isn't open.
  // Distinguish a cold start ("Starting Hermes...") from a dropped connection
  // we're trying to restore. During reconnect, keep the textbox editable so a
  // flaky network doesn't block drafting; only submit/backend actions stay
  // disabled until the gateway is open again.
  return disabled
    ? reconnecting
      ? t.composer.placeholderReconnecting
      : t.composer.placeholderStarting
    : restingPlaceholder
}
