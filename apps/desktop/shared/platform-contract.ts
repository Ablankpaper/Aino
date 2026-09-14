export type PlatformAccountPhase = 'signed_out' | 'loading' | 'signed_in' | 'offline' | 'reauth_required'

export interface PlatformAccountSnapshot {
  revision: number
  phase: PlatformAccountPhase
  account: null | { id: string; display_name: string; phone_masked: string; email: string }
  mode: 'production' | 'development'
  remember_state: 'encrypted' | 'session_only'
  error: null | { code: string; retry_after?: number }
}

export interface PlatformCaptchaProof {
  turnstile_token?: string
  tencent_captcha_ticket?: string
  tencent_captcha_randstr?: string
}

export interface PlatformPublicCapabilities {
  desktop_api_version: number
  registration_enabled: boolean
  phone_login_enabled: boolean
  phone_registration_enabled: boolean
  phone_binding_enabled: boolean
  phone_regions: string[]
  phone_code_length: number
  invitation_code_enabled: boolean
  promo_code_enabled: boolean
  login_agreement_enabled: boolean
  login_agreement_mode: string
  login_agreement_revision: string
  login_agreement_documents: Array<{ id: string; title: string; content_md: string }>
  captcha: {
    provider: 'disabled' | 'turnstile' | 'aliyun' | 'tencent'
    site_key: string
    scene_id: string
    prefix: string
    region: string
  }
}

export interface PhoneChallengeDTO {
  challenge_id: string
  expires_in: number
  retry_after: number
  delivery: string
}
export interface PhoneVerifyDTO {
  phone: string
  challenge_id: string
  code: string
  register_if_new: boolean
  agreement_revision: string
  invitation_code?: string
  promo_code?: string
  remember: boolean
}
export type PlatformAuthResult = { status: 'signed_in'; snapshot: PlatformAccountSnapshot } | { status: 'requires_2fa' }

export interface PlatformAccountBridge {
  status(): Promise<PlatformAccountSnapshot>
  capabilities(): Promise<PlatformPublicCapabilities>
  requestPhoneCode(input: { phone: string; captcha_proof?: PlatformCaptchaProof }): Promise<PhoneChallengeDTO>
  verifyPhoneCode(input: PhoneVerifyDTO): Promise<PlatformAuthResult>
  loginExisting(input: {
    email: string
    password: string
    captcha_proof?: PlatformCaptchaProof
    remember: boolean
  }): Promise<PlatformAuthResult>
  completeSecondFactor(input: { totp_code: string }): Promise<PlatformAccountSnapshot>
  updateProfile(input: { display_name: string }): Promise<PlatformAccountSnapshot>
  requestBindingCode(input: { phone: string }): Promise<PhoneChallengeDTO>
  submitStepUp(input: { totp_code: string }): Promise<PlatformAccountSnapshot>
  bindPhone(input: { phone: string; challenge_id: string; code: string }): Promise<PlatformAccountSnapshot>
  logout(): Promise<PlatformAccountSnapshot>
  onChanged(listener: (snapshot: PlatformAccountSnapshot) => void): () => void
}

export interface PlatformCaptchaBridge {
  getChallenge(): Promise<{ nonce: string }>
  submit(input: { nonce: string; proof: PlatformCaptchaProof }): Promise<void>
}
