import { createContext, useContext } from 'react'

import type { AccountActions } from '@/store/account'

export const AccountContext = createContext<AccountActions | null>(null)

export function useAccountActions(): AccountActions {
  const actions = useContext(AccountContext)

  if (!actions) {
    throw new Error('Account UI requires AccountGate')
  }

  return actions
}
