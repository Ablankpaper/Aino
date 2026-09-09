import { useStore } from '@nanostores/react'
import { useEffect, useRef, useState } from 'react'

import { $profileCreateRequest, $profiles, refreshActiveProfile, selectProfile } from '@/store/profile'

import { CreateProfileDialog } from './create-profile-dialog'

/**
 * Owns the application-level create-profile dialog requested by surfaces that
 * do not render the Settings profile rail (for example the chat keybind and
 * sidebar filter menu). The request atom is deliberately a one-way signal;
 * the dialog's open state remains local to this host.
 */
export function ProfileCreateDialogHost() {
  const profiles = useStore($profiles)
  const createRequest = useStore($profileCreateRequest)
  const [open, setOpen] = useState(false)
  const lastCreateRef = useRef(createRequest)

  // eslint-disable-next-line no-restricted-syntax -- one-shot request-seen sentinel, not an atom mirror
  useEffect(() => {
    if (createRequest === lastCreateRef.current) {
      return
    }

    lastCreateRef.current = createRequest
    setOpen(true)
  }, [createRequest])

  return (
    <CreateProfileDialog
      onClose={() => setOpen(false)}
      onCreated={async name => {
        await refreshActiveProfile()
        selectProfile(name)
      }}
      open={open}
      profiles={profiles}
    />
  )
}
