import { type NativeLocale, normalizeNativeLocale } from './native-locale'

interface BindingPrompt {
  message: string
  detail: string
  buttons: string[]
}

const copy: Record<NativeLocale, BindingPrompt> = {
  zh: {
    message: '允许此远程环境使用 Aino 模型？',
    detail: '将向下方主机提供短期模型调用凭据，使用会消耗你的 Aino 额度。授权仅在当前连接有效。',
    buttons: ['取消', '允许']
  },
  'zh-hant': {
    message: '允許此遠端環境使用 Aino 模型？',
    detail: '將向下方主機提供短期模型呼叫憑證，使用會消耗你的 Aino 額度。授權僅在目前連線有效。',
    buttons: ['取消', '允許']
  },
  en: {
    message: 'Allow this remote environment to use Aino models?',
    detail:
      'The host below will receive a short-lived model credential. Usage consumes your Aino allowance. Authorization lasts for this connection only.',
    buttons: ['Cancel', 'Allow']
  },
  ja: {
    message: 'このリモート環境で Aino モデルを使用しますか？',
    detail:
      '下記のホストに短期のモデル認証情報を提供します。利用時に Aino の残高を消費します。許可は現在の接続中のみ有効です。',
    buttons: ['キャンセル', '許可']
  },
  ar: {
    message: 'السماح لهذه البيئة البعيدة باستخدام نماذج Aino؟',
    detail:
      'سيتلقى المضيف أدناه بيانات اعتماد قصيرة الأجل للنموذج. يستهلك الاستخدام رصيد Aino الخاص بك. التفويض صالح لهذا الاتصال فقط.',
    buttons: ['إلغاء', 'السماح']
  }
}

export function platformBindingPrompt(locale: string, host: string) {
  const value = copy[normalizeNativeLocale(locale)]

  return { ...value, detail: `${value.detail}\n\n${host}`, cancelId: 0, defaultId: 0, type: 'question' as const }
}
