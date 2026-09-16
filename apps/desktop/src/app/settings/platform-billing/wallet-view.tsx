import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n'
import { CreditCard, RefreshCw } from '@/lib/icons'

import { ListRow, SettingsSection } from '../primitives'

import { formatUsageAmount } from './usage-view'
import { useWallet } from './use-wallet'

export function PlatformWallet() {
  const { t, locale } = useI18n()
  const copy = t.platformWallet
  const { available, wallet, loading, error, refresh } = useWallet()

  if (!available) {
    return null
  }

  return (
    <div className="mt-8 min-w-0">
      <SettingsSection
        aside={
          <Button disabled={loading} onClick={refresh} size="sm" variant="ghost">
            <RefreshCw />
            {copy.refresh}
          </Button>
        }
        icon={CreditCard}
        title={copy.title}
      >
        {loading && !wallet && <Loader />}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {t.settings.account.platformError(error)}
          </p>
        )}
        {wallet && (
          <>
            <div className="py-3">
              <p className="text-xs text-muted-foreground">{copy.available}</p>
              <p className="mt-1 text-2xl font-medium tabular-nums [overflow-wrap:anywhere]">
                {formatUsageAmount(wallet.available_balance)} {wallet.currency}
              </p>
            </div>
            <ListRow
              action={
                <span className="tabular-nums [overflow-wrap:anywhere]">
                  {formatUsageAmount(wallet.frozen_balance)} {wallet.currency}
                </span>
              }
              title={copy.frozen}
            />
            {!wallet.payment_enabled && <p className="mt-2 text-xs text-muted-foreground">{copy.paymentDisabled}</p>}
            <p className="mt-3 text-xs text-muted-foreground">
              {copy.updated}: {new Date(wallet.updated_at).toLocaleString(locale)}
            </p>
          </>
        )}
      </SettingsSection>
      {wallet && (
        <SettingsSection icon={CreditCard} title={copy.subscriptions}>
          {wallet.active_subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noSubscriptions}</p>
          ) : (
            <ul className="m-0 list-none space-y-4 p-0">
              {wallet.active_subscriptions.map(subscription => (
                <li className="min-w-0" key={subscription.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{subscription.name}</span>
                    <span className="tabular-nums [overflow-wrap:anywhere]">
                      {subscription.remaining === null
                        ? copy.unlimited
                        : `${formatUsageAmount(subscription.remaining)} ${subscription.unit}`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.expires}: {new Date(subscription.expires_at).toLocaleDateString(locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SettingsSection>
      )}
    </div>
  )
}
