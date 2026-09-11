import { useStore } from '@nanostores/react'
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { type AccountActions, createAccountActions } from '@/store/account'
import { $activeConnectionId } from '@/store/connections'
import { requestGatewayForAgent } from '@/store/gateway'
import { $gatewayState } from '@/store/session'

import { AccountContext } from './account-context'
import { AccountLoginCard } from './account-login-card'

export interface AccountFlowProps {
  actions: AccountActions
  connected: boolean
  children: ReactNode
}

export function AccountFlow({ actions, connected, children }: AccountFlowProps) {
  const state = useStore(actions.state)
  const { t } = useI18n()
  const copy = t.settings.account
  const navigate = useNavigate()
  const loginContent = useRef<HTMLDivElement>(null)
  const [windowError, setWindowError] = useState(false)
  const [workspaceReady, setWorkspaceReady] = useState(false)

  useEffect(() => {
    if (connected) {
      void actions.refresh()
    }
  }, [actions, connected])

  useLayoutEffect(() => {
    const setMode = window.hermesDesktop?.setAccountWindowMode
    let active = true

    if (state.authenticated) {
      // Mount the workspace only after native bounds are restored. Otherwise
      // its responsive layout observes the login width and collapses panes.
      void Promise.resolve(setMode?.('workspace'))
        .then(() => {
          if (active) {
            setWorkspaceReady(true)
          }
        })
        .catch(() => {
          if (active) {
            setWindowError(true)
          }
        })

      return () => {
        active = false
      }
    }

    setWorkspaceReady(false)

    if (!setMode) {
      return
    }

    const content = loginContent.current

    if (!content) {
      return
    }

    const resize = () => {
      if (active && content.isConnected) {
        void setMode('login', content.scrollHeight).catch(() => setWindowError(true))
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(content)

    return () => {
      active = false
      observer.disconnect()
    }
  }, [state.authenticated])

  return (
    <AccountContext.Provider value={actions}>
      {state.authenticated && workspaceReady ? (
        children
      ) : state.authenticated ? (
        <main className="grid h-screen place-items-center bg-(--ui-chat-surface-background)">
          <p role="status">{windowError ? copy.errors.unavailable : copy.loadingStatus}</p>
        </main>
      ) : (
        <main
          aria-label={copy.signInTitle}
          className="aino-account-window h-screen w-full overflow-y-auto bg-(--ui-chat-surface-background) text-(--ui-text-primary)"
          data-account-login-page=""
          onKeyDownCapture={event => event.stopPropagation()}
        >
          <div className="flex w-full flex-col items-center" ref={loginContent}>
            <AccountLoginCard
              canSignIn={state.canSignIn && connected}
              developmentMode={state.mode === 'development'}
              error={state.error}
              loading={state.loading}
              onRequestCode={actions.requestCode}
              onVerifyCode={async (identifier, code) => {
                const result = await actions.verifyCode(identifier, code)

                if (result?.authenticated) {
                  navigate('/', { replace: true })
                }
              }}
            />
            {(!connected || (!state.ready && !state.error)) && (
              <p className="text-sm text-(--ui-text-tertiary)" role="status">
                {copy.loadingStatus}
              </p>
            )}
            {state.ready && !state.canSignIn && (
              <p className="max-w-sm text-center text-sm text-(--ui-text-tertiary)">{copy.serviceUnavailable}</p>
            )}
            {windowError && <p className="px-8 pb-4 text-center text-xs text-destructive">{copy.errors.unavailable}</p>}
            {((state.error && !state.ready) || (state.ready && !state.canSignIn)) && (
              <Button disabled={state.loading || !connected} onClick={() => void actions.refresh()} variant="text">
                {copy.refresh}
              </Button>
            )}
          </div>
        </main>
      )}
    </AccountContext.Provider>
  )
}

export function AccountGate({ children }: { children: ReactNode }) {
  const connectionId = useStore($activeConnectionId)
  const gatewayState = useStore($gatewayState)

  // Aino identity belongs to the connection's default account home; selecting a
  // project or agent workspace must not switch the signed-in user's identity.
  const actions = useMemo(
    () => createAccountActions((method, params) => requestGatewayForAgent(connectionId, 'default', method, params)),
    [connectionId]
  )

  return (
    <AccountFlow actions={actions} connected={gatewayState === 'open'}>
      {children}
    </AccountFlow>
  )
}
