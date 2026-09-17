# A：短信与统一账户 Implementation Plan

> 进度说明：以下复选框保留原始任务拆解，不表示当前实施待办；实际已完成阶段、对应提交和验收边界统一以 [阶段进度](../implementation/aino-platform-progress.md) 与 [验收矩阵](../implementation/aino-platform-acceptance-matrix.md) 为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 真实手机号登录和已有账户绑定在站点、桌面共同可用，同一身份始终指向同一用户。

**Architecture:** Aino-API 扩展 canonical identity 与 SMS challenge，保留既有 token pair/TOTP。Electron 拥有平台账户登录，原小窗口仅更换数据源与必要状态。

**Tech Stack:** Go/Gin/Ent/PostgreSQL/Redis/阿里云 Dysmsapi；Vue；Electron/React/nanostores。

**Spec:** [完整设计第 2–6 节](/Users/zizimutou/Protect/Aino/docs/aino-platform/design.md)。

## Global Constraints

- 遵守[总计划 Global Constraints](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)。
- `provider_type=phone`、`provider_key=default`、E.164 主体；首版 `+86`。
- 占位地址只在内部使用 `UUID@phone.aino.invalid`，不包含手机号、不作为真实邮箱身份。
- 正式随机码；`1234` 只能在显式本地开发模式；默认冷却 60 秒、5 次校验上限。
- 绑定不复制账户、不合并余额、不发重复赠金；手机号登录不能绕过已有 MFA。
- 登录/钱包权威在 Aino-API，不在 profile 的 `account.json`。

命令工作目录：`go`/`make generate` 在 `/Users/zizimutou/Protect/Aino-API/backend`；`pnpm` 在 `/Users/zizimutou/Protect/Aino-API/frontend`；`scripts/run_tests.sh` 在 `/Users/zizimutou/Protect/Aino`；`npm` 在 `/Users/zizimutou/Protect/Aino/apps/desktop`。仓库status/commit命令在对应仓库根目录。

## A1：电话身份、数据库与老用户兼容

**Files（Aino-API）:**

- Create: `backend/internal/service/phone_identity.go`、`phone_identity_test.go`。
- Modify: `backend/ent/schema/auth_identity.go`、`user.go`；必要的 provider-default schema。
- Create: `backend/migrations/239_phone_auth_identity.sql`（执行前核对编号是否空闲；撞号就顺延，不动旧文件）。
- Modify: `backend/internal/service/auth_service.go` 的保留域/来源辅助函数；`auth_email_binding.go`、`user_service.go` 中身份摘要的实际定义；`backend/internal/handler/dto/mappers.go`、`dto/types.go`、`user_handler.go`。
- Test: `backend/internal/repository/phone_identity_integration_test.go`、`backend/internal/service/phone_identity_test.go`。

**Interfaces:**

```go
func NormalizeCNPhone(raw string) (string, error)
func NewPhonePlaceholderEmail() (string, error)
func IsPhonePlaceholderEmail(email string) bool
func MaskPhone(e164 string) string
```

对外 profile 新增 `phone_bound bool`、`phone_masked string`、`display_name string`；既有 `email_bound` 正确表示真实邮箱。以既有 `auth_bindings`/identity summary map 增加 phone，不能再单存一个可能不同步的用户 phone 字段。

- [ ] **Step 1：新增规范化与内部邮箱不可外泄测试。** 测试只使用本地 fixture 号码，不发送。

```go
func TestNormalizeCNPhoneEquivalentForms(t *testing.T) {
    a, err := NormalizeCNPhone("13900000000")
    require.NoError(t, err)
    b, err := NormalizeCNPhone("+86 139 0000 0000")
    require.NoError(t, err)
    require.Equal(t, a, b)
    _, err = NormalizeCNPhone("13900000000,13800000000")
    require.Error(t, err)
}

func TestPhonePlaceholderIsNotAContact(t *testing.T) {
    address, err := NewPhonePlaceholderEmail()
    require.NoError(t, err)
    require.True(t, IsPhonePlaceholderEmail(address))
    require.False(t, hasBindableEmailIdentitySubject(address))
}
```

- [ ] **Step 2：运行红灯。** `go test ./internal/service -run 'TestNormalizeCNPhone|TestPhonePlaceholder'`。
- [ ] **Step 3：实现正规化/保留域与约束。** 用白名单字符处理空格/前缀，匹配中国大陆基本号段格式；不要硬编码运营商详细号段。新建的部分索引等价于：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS auth_identities_phone_per_user
  ON auth_identities (user_id)
  WHERE provider_type = 'phone';
```

原有 provider CHECK 需要替换为包含 phone 的完整现有集合，不能漏掉 dingtalk 等已支持值。同步 signup_source、grant provider 约束。只增新迁移。
- [ ] **Step 4：真实 PostgreSQL 迁移与并发约束测试。** 复用现有 testcontainers/repository fixture：同号两用户只有一个成功；同用户两个号被拒绝；已有 email/oauth 数据、密码哈希、余额和订单原样保留。渲染 DTO 的 phone placeholder 不出现在姓名、邮箱、通知目标或导出联系字段中。
- [ ] **Step 5：生成并复核。** `make generate`，然后 `go test ./internal/service ./internal/handler/dto`、`go test -tags=integration ./internal/repository -run PhoneIdentity`。执行 email/identity 相邻回归；查看 `git diff --check` 和生成差异。
- [ ] **Step 6：提交。** 建议 `feat(auth): add canonical phone identity compatibility`。在进度文档记录迁移编号。

## A2：短信 sender、Redis 原子 challenge 与配置

**Files（Aino-API）:**

- Create: `backend/internal/service/sms_service.go`、`sms_aliyun.go`、`setting_sms.go` 及各自 `_test.go`。
- Create: `backend/internal/repository/sms_cache.go`、`sms_cache_integration_test.go`。
- Modify: `backend/internal/config/config.go`、`backend/internal/service/wire.go`、`backend/internal/repository/wire.go`、`backend/internal/handler/wire.go`、`backend/cmd/server/wire.go` 及生成物（存在位置以当前仓库为准）。
- Modify: `backend/go.mod`/`go.sum`、`deploy/config.example.yaml`（无真实凭据）。

**Interfaces:**

```go
type SMSMessage struct {
    Phone string
    SignName string
    TemplateCode string
    Params map[string]string
}
type SMSSendResult struct { BizID string; RequestID string; Code string }
type SMSSender interface {
    Send(ctx context.Context, message SMSMessage) (SMSSendResult, error)
}
type PhoneCodeInput struct {
    Phone string
    Purpose string // login | bind_phone
    UserID int64   // 绑定用途从 auth context 取；login 为 0
    SessionFamilyID string
    ClientIP string
}
type PhoneCodeChallenge struct {
    ID string
    ExpiresIn int
    RetryAfter int
    Delivery string
}
type PhoneCodeProof struct { Phone string; Purpose string; UserID int64; SessionFamilyID string }
func (s *SMSService) RequestCode(ctx context.Context, input PhoneCodeInput) (*PhoneCodeChallenge, error)
func (s *SMSService) ConsumeCode(ctx context.Context, input PhoneCodeInput, challengeID, code string) (*PhoneCodeProof, error)
```

配置最终键统一为 `sms.enabled`、`sms.provider`、`sms.sign_name`、`sms.template_code`、`sms.template_params`、`sms.code_length`、`sms.ttl_seconds`、`sms.cooldown_seconds`、`sms.max_attempts`、`sms.phone_hour_limit`、`sms.phone_day_limit`、`sms.ip_hour_limit`、`sms.global_day_limit`。`template_params` 将审核变量名映射到受支持的 `code`/`ttl_minutes` 等服务器值，不接受任意表达式执行。秘密从既有服务端 secret 配置方式引入，命名与后台实现同步写入部署文档，不写入公开 settings。

- [ ] **Step 1：创建真实 Redis fixture 与可控 sender。** 新增 `backend/internal/service/sms_test_support_test.go`：`newSMSTestRig(t)` 使用真实 SMSService、临时 Redis、固定时钟/安全固定测试 random reader、记录发送内容的 fake sender。它必须提供 `Service`、`Input`、`LastCode`、`SendCount()`、`CloseRedis()`；不得 fake ConsumeCode。

```go
func TestSMSOneUseAcrossConcurrentVerification(t *testing.T) {
    f := newSMSTestRig(t)
    challenge, err := f.Service.RequestCode(context.Background(), f.Input)
    require.NoError(t, err)
    code := f.LastCode()
    var ok atomic.Int32
    var wg sync.WaitGroup
    for i := 0; i < 8; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            if _, err := f.Service.ConsumeCode(context.Background(), f.Input, challenge.ID, code); err == nil {
                ok.Add(1)
            }
        }()
    }
    wg.Wait()
    require.EqualValues(t, 1, ok.Load())
}
```

- [ ] **Step 2：红灯。** `go test -tags=integration ./internal/service -run TestSMSOneUse`；无 Redis 环境不跳过后声称已通过。
- [ ] **Step 3：实现限流和消费。** Redis 脚本原子更新手机号跨用途冷却、各级配额、失败次数、TTL 与 consumed 状态；HMAC 覆盖 challenge/phone/purpose/code。不能把绑定 code 用来登录。校验成功后立即消费，后续 DB 失败不恢复该 code；用户重新发码重试，既有身份/赠送唯一性负责避免重复账户。

```text
request: validate config → validate captcha at handler → reserve rate slots
         → create sending challenge → SendSms once → submitted / failed / unknown
consume: check phone + purpose + principal + TTL + attempts
         → constant-time verify → atomic claim/consume → proof for this request only
```

- [ ] **Step 4：实现 Aliyun adapter 和严格 dev guard。** 使用官方 SDK 注入测试 HTTP transport，核对 `SignName`/`TemplateCode`/序列化 JSON `TemplateParam`；`Code != OK` 即业务失败。禁用自动 SendSms 重试。正式凭据/模板不全返回不可用；本地 fake mode 明确标记，不携带正式 origin，不在 production 解锁固定码。
- [ ] **Step 5：验收整个错误矩阵。** 测试：发码冷却并发、Redis 断开 fail closed、错误次数/过期不延时、跨用户绑定拒绝、重发旧码失效、sender 超时不重发、Code 非 OK、签名/模板变量缺失、固定码生产拒绝、日志无验证码。测试真实 Redis Lua 不只 miniredis。
- [ ] **Step 6：回归/提交。** `go test ./internal/service ./internal/repository`；`go test -tags=integration ./internal/service ./internal/repository -run SMS`；`make generate`。建议提交 `feat(auth): add guarded Aliyun SMS challenges`。

## A3：登录、已有账户绑定与认证政策

**Files（Aino-API）:**

- Create: `backend/internal/service/auth_phone.go`、`auth_phone_binding.go`。
- Create: `backend/internal/handler/auth_phone_handler.go`、`user_phone_handler.go`。
- Modify: `backend/internal/server/routes/auth.go`、`user.go`；`backend/internal/handler/auth_handler.go` 公共成功/2FA 处理；`backend/internal/service/auth_service.go` 既有 signup grant 与 session 函数。
- Modify: `backend/internal/handler/dto/settings.go`、`setting_handler.go`、settings 公开配置 mapper；确保 HTML 注入 config 与 GET public 一致。
- Test: `backend/internal/handler/auth_phone_handler_test.go`、`backend/internal/service/auth_phone_integration_test.go`、`auth_phone_binding_integration_test.go`。

**Interfaces:** 消费 A2 `PhoneCodeProof`，输出 spec 5.1 的 HTTP 契约。

```go
type PhoneVerifyInput struct {
    Phone string `json:"phone"`
    ChallengeID string `json:"challenge_id"`
    Code string `json:"code"`
    RegisterIfNew bool `json:"register_if_new"`
    AgreementRevision string `json:"agreement_revision"`
    InvitationCode string `json:"invitation_code,omitempty"`
    PromoCode string `json:"promo_code,omitempty"`
}
func (s *AuthService) LoginOrRegisterPhone(ctx context.Context, proof PhoneCodeProof, input PhoneVerifyInput) (*User, bool, error)
func (s *AuthService) BindPhoneIdentity(ctx context.Context, userID int64, proof PhoneCodeProof) (*User, error)
```

- [ ] **Step 1：先建行为级 handler/integration fixture。** `newPhoneAuthRig(t)` 必须使用真实 router、AuthService、SMSService、PostgreSQL、Redis；fake 仅位于短信出口。提供 `CreateEmailUser`、`BindPhone`、`LoginPhone`、`Balance`、`CountSignupGrants`；类型直接使用现有 `service.User`，不要根据手机号 hardcode 假账户。

```go
func TestPhoneBindingKeepsAccountAndBalance(t *testing.T) {
    f := newPhoneAuthRig(t)
    user := f.CreateEmailUser("member@example.test", "10.00000000")
    before := f.Balance(user.ID)
    f.BindPhone(user.ID, "+8613900000000")
    loggedIn := f.LoginPhone("13900000000")
    require.Equal(t, user.ID, loggedIn.ID)
    require.Equal(t, before, f.Balance(user.ID))
    require.EqualValues(t, 0, f.CountSignupGrants(user.ID, "phone"))
}
```

- [ ] **Step 2：红灯。** `go test -tags=integration ./internal/service ./internal/handler -run 'PhoneBinding|PhoneLogin|PhoneSignup'`。
- [ ] **Step 3：实现真实事务。** 先消费用途绑定证明，再在事务内查 canonical identity、检查账户状态或按既有政策创建用户/identity/一次性 grant。并发唯一冲突后读取已验证号码的最终归属，不按客户端邮箱找人。绑定只允许当前主体，phone 不产生首次绑定赠金。不要调用自动按同邮箱并号的 OAuth helper。
- [ ] **Step 4：复用认证完成机制。** 实际 2FA 字段是 `requires_2fa`、`temp_token`，完成请求使用 `totp_code`；普通成功走既有 `respondWithTokenPair`。抽出够小的共同收尾函数供 email/phone 使用，避免两份封禁/MFA判断。phone-only 不显示占位邮箱；需要第二因素时只返回挑战，不提前签发正式令牌。
- [ ] **Step 5：覆盖政策和越权。** 注册关闭后老用户仍登录、新用户不建立；未同意当前协议不能创建；邀请模式不能被手机注册绕过；被禁用用户不能登录；绑定同号其他人返回 409；绑定要求近期认证；仅剩一个 phone 的账户无法通过旧通用解绑 API 锁死自己。公开 send-code 不返回 exists。
- [ ] **Step 6：回归/提交。** 完整 auth/email/TOTP/identity/registration 相关测试，加真实 DB/Redis 集成。建议提交 `feat(auth): unify phone login and existing account binding`。

## A4：站点登录、个人资料、短信管理与协议

**Files（Aino-API）:**

- Modify: `frontend/src/views/auth/LoginView.vue`、`frontend/src/api/auth.ts`、`frontend/src/api/user.ts`、`frontend/src/stores/auth.ts`、`frontend/src/types/index.ts`。
- Create: `frontend/src/api/phone.ts`、`frontend/src/components/auth/PhoneLoginForm.vue`、`frontend/src/components/user/profile/PhoneBindingForm.vue`。
- Create: `frontend/src/views/auth/DesktopCaptchaView.vue`，在站点既有router中注册 `/desktop/captcha`，只复用captcha挑战不加载账户资料。
- Modify: `frontend/src/components/user/profile/ProfileIdentityBindingsSection.vue`、`ProfileAccountBindingsCard.vue`、`frontend/src/views/user/ProfileView.vue`。
- Create: `frontend/src/components/admin/settings/SmsSettingsSection.vue`；在现有 `frontend/src/views/admin/SettingsView.vue` 组合，沿用现有 admin settings endpoint。
- Test: 对应 `__tests__/PhoneLoginForm.spec.ts`、`PhoneBindingForm.spec.ts`、`SmsSettingsSection.spec.ts`；更新 `frontend/src/i18n/locales/` 的实际语言文件。

**Interfaces:** 只消费 A3/public settings；captcha 继续复用现有 auth 组件；短信设置的秘密状态只读 `configured`，不能 GET 得到原值。

- [ ] **Step 1：先写 UI 合同测试。** 行为例：

```ts
it('keeps the account while binding a verified phone', async () => {
  const wrapper = mount(PhoneBindingForm, { props: { accountId: '17' } })
  await wrapper.get('input[type="tel"]').setValue('13900000000')
  await wrapper.get('[data-testid="request-phone-code"]').trigger('click')
  expect(phoneApi.requestBindingCode).toHaveBeenCalledWith({ phone: '13900000000' })
  expect(authApi.register).not.toHaveBeenCalled()
})
```

`phoneApi` 为新 `frontend/src/api/phone.ts` 暴露 `requestLoginCode`、`verifyLoginCode`、`requestBindingCode`、`bindPhone`；通过现有 HTTP client 包装实际路由。测试 mock 此网络边界，不 mock 组件分支。测试中的 accountId 只用于视图，不传作服务端授权主体。
- [ ] **Step 2：运行新文件红灯。** `pnpm exec vitest run src/components/auth/__tests__/PhoneLoginForm.spec.ts src/components/user/profile/__tests__/PhoneBindingForm.spec.ts`。
- [ ] **Step 3：实现三个独立小模块。** 手机登录保留邮箱/第三方；绑定显示当前账户信息且不能建新钱包；管理员 SMS 设置有权限、状态、保存失败反馈、显式测试发送和额度上限，秘密只允许替换/保留，不回显。
- [ ] **Step 4：处理状态与隐私。** 倒计时用服务端 retry/expiry；编辑手机号作废旧 challenge；过期请求不能改变新步骤；captcha 未通过不发码；TOTP 页正确显示；无真实邮箱不渲染占位地址；协议使用已有版本机制，不附开发提示冒充正式协议。
- [ ] **Step 5：验收。** 验证新旧登录、服务不可用、注册关闭、空手机号、429、MFA、绑定冲突与网络失败；运行站点全部 Vitest、typecheck、lint:check、build。
- [ ] **Step 6：提交。** 建议 `feat(web): add phone sign-in and account binding controls`。

## A5：Electron 平台账户、令牌与 typed IPC

**Files（Aino）:**

- Create: `apps/desktop/shared/platform-contract.ts`。
- Create: `apps/desktop/electron/platform-client.ts`、`platform-auth.ts`、`platform-token-store.ts`、`platform-ipc.ts` 及 `.test.ts`。
- Create: `apps/desktop/electron/platform-captcha.ts`、`platform-captcha-preload.ts` 与安全边界测试；该独立preload只允许取得当前nonce并回传一次challenge结果，不暴露主应用能力。
- Modify: `apps/desktop/electron/preload.ts`、`main.ts`（仅模块接线）、`apps/desktop/src/global.d.ts`、相关 tsconfig。
- Reuse, not replace: `native-token-store.ts`、`native-oauth.ts` 的解析/时序经验；`secret-storage-policy.ts` 保持既有秘密策略。

**Interfaces:**

```ts
interface PlatformAccountSnapshot {
  revision: number;
  phase: 'signed_out' | 'loading' | 'signed_in' | 'offline' | 'reauth_required';
  account: null | { id: string; display_name: string; phone_masked: string; email: string };
  mode: 'production' | 'development';
  remember_state: 'encrypted' | 'session_only';
  error: null | { code: string; retry_after?: number };
}
interface PlatformAccountBridge {
  status(): Promise<PlatformAccountSnapshot>;
  requestPhoneCode(input: { phone: string; captcha_proof?: Record<string, string> }): Promise<PhoneChallengeDTO>;
  verifyPhoneCode(input: PhoneVerifyDTO): Promise<PlatformAuthResult>;
  loginExisting(input: { email: string; password: string; captcha_proof?: Record<string, string> }): Promise<PlatformAuthResult>;
  completeSecondFactor(input: { totp_code: string }): Promise<PlatformAccountSnapshot>;
  updateProfile(input: { display_name: string }): Promise<PlatformAccountSnapshot>;
  requestBindingCode(input: { phone: string }): Promise<PhoneChallengeDTO>;
  bindPhone(input: { phone: string; challenge_id: string; code: string }): Promise<PlatformAccountSnapshot>;
  logout(): Promise<PlatformAccountSnapshot>;
  onChanged(listener: (snapshot: PlatformAccountSnapshot) => void): () => void;
}
interface PlatformDevice {
  device_id: string; name: string; current: boolean;
  last_used_at: string | null; active_grants: number;
}
interface PlatformDevicesBridge {
  list(): Promise<PlatformDevice[]>;
  revoke(device_id: string): Promise<void>;
}
interface PhoneChallengeDTO { challenge_id: string; expires_in: number; retry_after: number; delivery: string }
interface PhoneVerifyDTO {
  phone: string; challenge_id: string; code: string;
  register_if_new: boolean; agreement_revision: string;
  invitation_code?: string; promo_code?: string;
}
type PlatformAuthResult =
  | { status: 'signed_in'; snapshot: PlatformAccountSnapshot }
  | { status: 'requires_2fa' };
```

内部 `temp_token` 也由 main 保存；renderer 只提交 TOTP 输入。扩展 `window.hermesDesktop.platformAccount`，不提供 `request(url, headers, body)` 这种任意代理。现有 IPC sender 校验模式需覆盖来源 main frame、主应用 URL 与允许窗口，不对嵌入网页开放。`platformDevices` 在B2设备接口完成后接入，账户页可列出并明确撤销设备，不能只存在于后端。

- [ ] **Step 1：为单飞刷新/旧结果和存储失败写红灯。** 主进程提供 `createPlatformAuth({ client, tokenStore, now })` 工厂；`client` 是本任务真实 platform-client 可注入 HTTP，`tokenStore` 是窄 I/O。

```ts
it('does not restore a logged-out account from a late response', async () => {
  const f = createPlatformAuthTestRig()
  const pending = f.auth.refresh()
  await f.auth.logout()
  f.http.resolvePendingProfile({ id: 17, username: 'old account' })
  await pending
  expect(f.auth.snapshot().phase).toBe('signed_out')
})
```

`createPlatformAuthTestRig` 写在 `electron/platform-auth.test.ts`，内部使用真实状态机＋延迟响应 HTTP fixture；不要 stub refresh 成直接 return。
- [ ] **Step 2：运行红灯。** `npm run test:desktop:platforms -- electron/platform-auth.test.ts electron/platform-token-store.test.ts`。
- [ ] **Step 3：实现 endpoint/令牌隔离。** 公开请求、账户请求 origin 固定；HTTPS 校验，禁跨域认证重定向；JSON schema/DTO 验证；非 2xx/业务错误统一转换；主进程单飞 refresh，revision 排除陈旧结果；密码/OTP用完释放引用且不记日志。
- [ ] **Step 4：实现独立 secure token store。** 原子写权限私有文件、OS 加密、拒绝 basic_text；不可加密时返回 session_only，不偷偷降级明文。读取失败不覆盖密文；明确退出后下次启动不能再次读取旧令牌。Mac/Windows/Linux 真机行为分开验收，单测以 I/O 依赖注入而非伪造系统。
- [ ] **Step 5：实现 IPC 与多窗口广播。** `platformAccount` 方法使用现有 preload 模式；只有安全快照/短期 UI error code 出 main；密钥和 token 不出。广播与 unsubscribe 测试；已登录关闭一个窗口不能注销所有窗口；服务断网不清空账户数据/转成测试模式。
- [ ] **Step 6：验收并提交。** Electron project tests、typecheck；测试跨域/任意 URL、恶意 iframe sender、refresh rotation、超时、明确 401、退出后的延迟响应和安全存储 unavailable。建议 `feat(desktop): add native platform account ownership`。

## A6：桌面独立登录窗口与我的账户接线

**Files（Aino）:**

- Modify: `apps/desktop/src/store/account.ts`、`store/account.test.ts`。
- Create: `apps/desktop/src/api/platform.ts`、`api/platform.test.ts`。
- Modify: `src/app/account/account-gate.tsx`、`account-login-card.tsx`、`account-context.ts` 及测试。
- Modify: `src/app/settings/account-settings.tsx` 及测试、左下角现有账户菜单消费点。
- Preserve: `electron/account-window.ts` 原生尺寸恢复逻辑；`tui_gateway/methods_account.py` 作为显式本地开发，不再充当正式身份。
- Update: `docs/desktop-account-auth.md`、四种 i18n catalog。

**Interfaces:** 保留小的 `AccountActions` UI 门面，内部生产实现绑定 A5 `platformAccount`；dev 适配器明确选用，不在线上失败时 fallback。

- [ ] **Step 1：添加账户独立于 backend 的行为测试。**

```tsx
it('keeps the platform identity when the agent connection changes', async () => {
  const f = renderAccountFlowWithPlatformAccount({ id: '17', display_name: '成员' })
  f.setAgentConnection('another-connection')
  expect(await screen.findByText('成员')).toBeVisible()
  expect(f.platformBridge.logout).not.toHaveBeenCalled()
  expect(f.gateway.callsFor('account.status')).toHaveLength(0)
})
```

此 helper 在 `account-gate.test.tsx` 复用现有 AccountFlow 渲染 fixture，仅提供平台桥与连接原子，不 fake 整个 AccountGate。
- [ ] **Step 2：红灯。** `npm run test:ui -- src/app/account src/store/account.test.ts src/app/settings/account-settings.test.tsx`。
- [ ] **Step 3：改成全局平台账户作用域。** 移除生产 AccountGate 对 `$activeConnectionId/default profile/gateway open` 的认证依赖；后台未启动也能登录。登录后 gateway 是否可用由原 boot 系统处理，不能互相锁死。只在真正 signed_out/reauth_required 进入登录界面，offline 保持可恢复页面。
- [ ] **Step 4：完善 phone/已有账户/TOTP 状态。** 保留 24:6/24:40/24:76 既有布局；新增已有账户入口和必要验证步骤用原 token/字号/尺寸，不能变成大工作区内居中卡片。普通登录不要求填邮箱。保留/明确未开通微信入口。协议、倒计时、429恢复、验证码粘贴、返回修改 phone 都接真实数据；若站点开启邀请注册，按public config显示邀请码输入并传既有字段，不绕过政策。
- [ ] **Step 4a：接通已有 captcha 策略。** captcha关闭时不显示假验证；开启时用服务端公开配置选择现有供应商。站点小路由 `/desktop/captcha` 复用已有Vue captcha组件；main在不带主应用preload、nodeIntegration=false、contextIsolation=true、sandbox=true的独立窗口打开，限制固定站点origin与已配置captcha资源。`platform-captcha-preload.ts` 仅接收该主frame同origin的结构化 `{ nonce, proof }` 并经单一专用IPC回main；main再次核验窗口ID、frame、origin、一次性nonce、有效期与操作generation，不暴露account/fetch/file能力。页面通过窄bridge取当前nonce；不向挑战页发账户JWT，nonce/proof不写URL或日志。用户取消关闭窗口时立即结束请求；captcha一次完成不能复用给另一发码操作。遇到不支持供应商要明确说明，不能跳过。补错误origin、过期nonce、子frame、跨窗口与取消测试。
- [ ] **Step 5：我的账户与迁移。** 显示真正 user ID 和脱敏手机，nickname 更新映射到服务端 username；旧本地 `account.json` 不自动转成真实用户、不用固定码导入身份、不删除本机历史。新账户第一次进入不覆盖既有自定义模型设置；平台默认由 B 阶段决策。
- [ ] **Step 6：自动与原生验收。** 同时打开两窗口、切 profile/项目/SSH、登录/退出/重启、恢复网络；确认输入草稿和既有原生窗口尺寸无回归。运行 UI/Electron/typecheck/build；留一份脱敏原生截图。
- [ ] **Step 7：提交并完成 A 门槛。** 建议 `feat(desktop): connect phone sign-in and my account to Aino API`。未有正式短信正文/凭据时标记「本地集成完成，真实短信未验证」，不宣称正式登录已可上线。
