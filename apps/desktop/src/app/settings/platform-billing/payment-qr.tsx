import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n'

export function PaymentQr({ payload }: { payload: string }) {
  const { t } = useI18n()
  const [result, setResult] = useState({ payload: '', url: '', failed: false })
  useEffect(() => {
    let active = true
    void QRCode.toDataURL(payload, { width: 240, margin: 2, errorCorrectionLevel: 'M' }).then(
      url => {
        if (active) {
          setResult({ payload, url, failed: false })
        }
      },
      () => {
        if (active) {
          setResult({ payload, url: '', failed: true })
        }
      }
    )

    return () => {
      active = false
    }
  }, [payload])

  return (
    <div className="mx-auto grid aspect-square w-60 max-w-full place-items-center">
      {result.payload !== payload ? (
        <Loader />
      ) : result.failed ? (
        <p role="alert">{t.platformRecharge.error}</p>
      ) : (
        <img alt={t.platformBillingHistory.qrCode} height={240} src={result.url} width={240} />
      )}
    </div>
  )
}
