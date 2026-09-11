import './account-login.css'

import { useEffect, useState } from 'react'

import accountLogo from '@/assets/aino-account/logo.png'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { Loader2 } from '@/lib/icons'
import type { AccountCodeResponse, AccountError } from '@/store/account'

type LoginStep = 'identifier' | 'code' | 'wechat'

export interface AccountLoginCardProps {
  developmentMode?: boolean
  error?: AccountError | null
  loading?: boolean
  canSignIn?: boolean
  onRequestCode: (identifier: string) => Promise<AccountCodeResponse | null>
  onVerifyCode: (identifier: string, code: string) => Promise<unknown>
}

export function AccountLoginCard({
  developmentMode = false,
  error,
  loading = false,
  canSignIn = true,
  onRequestCode,
  onVerifyCode
}: AccountLoginCardProps) {
  const { t } = useI18n()
  const copy = t.settings.account
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<LoginStep>('identifier')
  const [retryAt, setRetryAt] = useState(0)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsRequired, setTermsRequired] = useState(false)
  const [legalPage, setLegalPage] = useState<'terms' | 'privacy' | null>(null)

  useEffect(() => {
    if (!retryAt) {
      return
    }

    const timer = window.setInterval(() => setRetrySeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))), 1000)

    return () => window.clearInterval(timer)
  }, [retryAt])

  const requestCode = async () => {
    const value = identifier.trim()

    if (!value || loading || !canSignIn) {
      return
    }

    if (!acceptedTerms) {
      setTermsRequired(true)

      return
    }

    const result = await onRequestCode(value)

    if (!result) {
      return
    }

    setIdentifier(value)
    setCode('')
    setRetryAt(Date.now() + result.retry_after * 1000)
    setRetrySeconds(result.retry_after)
    setStep('code')
  }

  const verifyCode = async () => {
    if (!code.trim() || loading) {
      return
    }

    await onVerifyCode(identifier, code.trim())
  }

  const errorText = termsRequired ? copy.termsRequired : error ? copy.errors[error.reason] : null

  return (
    <div className="aino-account-login" data-account-login-card="">
      <div aria-hidden="true" className="aino-account-chrome">
        <span />
        <span />
        <span />
      </div>
      <div className="aino-account-body">
        <p className="aino-account-brand">AINO</p>
        <img alt="" className="aino-account-mark" src={accountLogo} />
        {step === 'identifier' && (
          <form
            className="aino-account-form"
            onSubmit={event => {
              event.preventDefault()
              void requestCode()
            }}
          >
            <Input
              aria-label={copy.identifierLabel}
              autoComplete="username"
              className="aino-account-input"
              disabled={loading}
              onChange={event => setIdentifier(event.target.value)}
              placeholder={copy.identifierPlaceholder}
              value={identifier}
            />
            <Button
              className="aino-account-submit"
              disabled={loading || !canSignIn || !identifier.trim()}
              type="submit"
            >
              {loading && <Loader2 className="animate-spin" />}
              {copy.sendCode}
            </Button>
            <div className="aino-account-terms">
              <Checkbox
                aria-label={copy.termsLabel}
                checked={acceptedTerms}
                className="aino-account-checkbox"
                onCheckedChange={value => {
                  setAcceptedTerms(value === true)
                  setTermsRequired(false)
                }}
              />
              <span>
                {copy.termsPrefix}{' '}
                <Button onClick={() => setLegalPage('terms')} size="inline" type="button" variant="link">
                  {copy.terms}
                </Button>{' '}
                {copy.and}{' '}
                <Button onClick={() => setLegalPage('privacy')} size="inline" type="button" variant="link">
                  {copy.privacy}
                </Button>
              </span>
            </div>
            <Button
              className="aino-account-switch"
              disabled={loading}
              onClick={() => setStep('wechat')}
              size="inline"
              type="button"
              variant="text"
            >
              {copy.switchWechat}
            </Button>
          </form>
        )}
        {step === 'code' && (
          <form
            className="aino-account-form"
            onSubmit={event => {
              event.preventDefault()
              void verifyCode()
            }}
          >
            <div className="aino-account-recipient">
              <p>{developmentMode ? copy.developmentCodeFor : copy.codeSentTo}</p>
              <p>{identifier}</p>
            </div>
            <Input
              aria-label={copy.codeLabel}
              autoComplete="one-time-code"
              className="aino-account-input aino-account-code"
              disabled={loading}
              inputMode="numeric"
              maxLength={6}
              onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
              placeholder={copy.codePlaceholder}
              value={code}
            />
            <Button className="aino-account-submit" disabled={loading || !code.trim()} type="submit">
              {loading && <Loader2 className="animate-spin" />}
              {copy.verify}
            </Button>
            <Button
              className="aino-account-resend"
              disabled={loading || retrySeconds > 0}
              onClick={() => void requestCode()}
              size="inline"
              type="button"
              variant="text"
            >
              {retrySeconds > 0 ? copy.resendIn(retrySeconds) : copy.resend}
            </Button>
            <Button
              className="aino-account-back"
              disabled={loading}
              onClick={() => setStep('identifier')}
              size="inline"
              type="button"
              variant="text"
            >
              {copy.back}
            </Button>
          </form>
        )}
        {step === 'wechat' && (
          <>
            <p className="aino-account-wechat-title">{copy.wechatTitle}</p>
            <div className="aino-account-wechat-unavailable" role="status">
              {copy.wechatUnavailable}
            </div>
            <Button className="aino-account-switch" onClick={() => setStep('identifier')} size="inline" variant="text">
              {copy.switchIdentifier}
            </Button>
          </>
        )}
        {errorText && (
          <p className="mt-4 text-center text-sm text-destructive" role="alert">
            {errorText}
          </p>
        )}
        {developmentMode && (
          <p className="mt-4 text-center text-xs text-(--ui-text-tertiary)">{copy.developmentHint}</p>
        )}
      </div>
      <Dialog
        onOpenChange={open => {
          if (!open) {
            setLegalPage(null)
          }
        }}
        open={legalPage !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{legalPage === 'privacy' ? copy.privacy : copy.terms}</DialogTitle>
            <DialogDescription>{copy.legalDevelopmentNotice}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
