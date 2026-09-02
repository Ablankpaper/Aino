import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'

import { $activeGatewayProfile } from '@/store/profile'

/** Run `onSwitch` when the active gateway profile changes — never on first
 *  mount. For dropping per-profile view state (probes, cached usage, drafts)
 *  when the backend the app talks to swaps underneath a still-mounted view. */
export function useOnProfileSwitch(onSwitch: () => void): void {
  const profile = useStore($activeGatewayProfile)
  // Keep the last profile value, rather than a one-shot "first" flag. React
  // StrictMode replays mount effects in development; a flag flipped by the
  // first pass makes the replay look like a real profile change and lets
  // consumers clear freshly-loaded state (settings pages then stay on their
  // skeleton forever). Comparing values is idempotent across both the replay
  // and any repeated effect setup.
  const previousProfile = useRef(profile)

  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    if (previousProfile.current === profile) {
      return
    }

    previousProfile.current = profile
    onSwitch()
    // Fire on profile change only; onSwitch identity is intentionally ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])
}
