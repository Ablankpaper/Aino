# Aino 平台一体化实施进度跟踪

**创建日期：** 2026-09-14
**执行者：** Claude Code（前期）与 Codex（复核及续作）
**总计划：** [implementation-plan.md](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)

## 2026-09-15 续作核验

用户已改为由 Codex 继续实施，不再交由 Claude 执行。下表区分已有代码、实际自动测试和真实服务联调；后文历史记录不能替代验收证据。

| 阶段 | 代码状态 | 本轮验证 | 真实服务联调 |
| --- | --- | --- | --- |
| A1-A3 身份、短信、认证 | 本地基础实现与修复已完成，独立复核通过 | 实际 PostgreSQL 18.1 / Redis 8.4 / JWT / HTTP 认证链路 25 项顶层测试及 4 项故障子场景通过；Go 构建与相关包回归通过 | 未进行 |
| A4 站点页面 | 已在 `26e373626` 实现，等待独立复核 | 站点 2,126 项通过、保留 2 项已记录旧失败；类型/lint/构建、Go 相关包及真实 PG/Redis 定向集成通过；桌面/窄屏页面已检查 | 未进行 |
| A5 原生平台账户 | 两个未跟踪的契约/存储文件，尚未接线 | 未验收 | 未进行 |
| A6 桌面登录接线 | 未完成 | 未运行 | 未进行 |
| B 内置模型 | 未开始 | 未运行 | 未进行 |
| C 钱包、充值、对账 | 未开始 | 未运行 | 未进行 |
| D 完整交付 | 未开始 | 未运行 | 未进行 |

接手基线 Aino 为 `1296aadc7c07861a0814a7de2660faab326ed35c`，API 为 `1289054141c116b8f27b494255aa1f5c45893290`。Aino 方案与核验文档已提交为 `ad85f2bc1b`。API 基线包含用户另一个定时能力评测设计提交，本任务不修改该文档。两仓库均在 `codex/aino-platform-identity-models-billing`。

本地 Docker `29.6.2` 已启动，使用测试容器，不连接生产数据库/Redis。本次未授权真实短信、付费推理、支付、推送、合并或生产部署。

本轮基线命令：

- API：`go test -count=1 ./internal/service ./internal/handler ./internal/config ./internal/repository ./migrations` 全部通过。
- Aino：账户 UI 13 项、原生窗口 2 项、Python 账户方法 10 项通过；桌面 `npm run typecheck` 通过。
- 站点：`vue-tsc --noEmit` 通过；完整 Vitest 为 2094 通过、2 失败。失败为原有 `ChannelMonitorView.grok.spec.ts` 固定模型提供商数量、`GroupsView.codexManifest.spec.ts` 缺少 Pinia 初始化，留待最终验收修正，不计为本轮认证回归。
- 本机 pnpm 11 自动安装产生的锁文件漂移已单独恢复；后续使用本地已安装工具，不把依赖升级混入业务改动。
- 隔离集成：`CI=true go test -tags=integration -count=1 ./internal/repository -run 'SMS|Migration|PhoneIdentity' -timeout 180s -v` 通过（7.452 秒），实际使用 PostgreSQL 18.1 和 Redis 8.4，未跳过容器测试。覆盖迁移幂等、短信原子消费、错误次数、跨会话拒绝与限流；完整登录/绑定 HTTP 流程仍在补验。
- 迁移修复：本分支尚未发布的 239 在 PostgreSQL 18 上错误选取 NOT NULL 约束，现改为精确替换指定 CHECK。历史 1–238 迁移未修改，未连接或更改生产数据库；如发现原 239 已在其他环境成功应用，需另行核对 checksum 兼容。

已修复并复核：绑定响应仅返回安全 DTO；验证码关联具体登录会话且新码使旧码失效；所有短信限流返回 `Retry-After`；绑定/解绑校验近期实际认证和 TOTP；并发手机号归属、占位邮箱隐私与故障关闭均有真实链路测试。API 修复提交为 `02244316c`、`9390af97b`、`b745b100d`、`233da912b`。后续 A4 继续补配置、官方 SDK 和网站体验，不代表短信已真实发送验证。

## Task 0：基线和开发现场

**状态：** ✅ 基线已核对；平台功能继续分阶段实施

### 基线检查结果

#### Aino 仓库
- **路径：** `/Users/zizimutou/Protect/Aino`
- **当前分支：** `codex/aino-platform-identity-models-billing`
- **HEAD：** `1296aadc7c07861a0814a7de2660faab326ed35c`
- **HEAD提交信息：** `docs: fix progress tracking - only A1 implemented`
- **要求基线：** `3bb72e32b1b2a83896439587651d73dd9a3d2319` (fix(desktop): simplify appearance and hide unsent session titles)
- **基线检查：** ✅ 基线提交存在于当前分支历史中（第3个祖先）
- **共同祖先：** 基线提交就是两分支（hide-unsent-session-title和当前分支）的共同祖先
- **工作树：** 进度文档有未提交修改；`docs/aino-platform/`、`apps/desktop/shared/platform-contract.ts`、`apps/desktop/electron/platform-token-store.ts` 未跟踪，全部保留

#### Aino-API 仓库
- **路径：** `/Users/zizimutou/Protect/Aino-API`
- **当前分支：** `codex/aino-platform-identity-models-billing`
- **HEAD：** `1289054141c116b8f27b494255aa1f5c45893290`
- **HEAD提交信息：** `docs: design scheduled capability benchmarks`（非本任务实现）
- **A2提交：** `0b38dd3c4` ✅ 已提交
- **A1提交：** `95f92b92e` ✅ 已提交
- **工作树：** A3 checkpoint 已提交，当前分支干净
- **A3 checkpoint：** `b7f7ed951`（`feat(auth): complete phone login and account binding`）

#### Remote配置
- **Aino origin：** `https://github.com/Ablankpaper/Aino.git`（2026-09-15 实际读取核实，原记录错误，并非远程配置错误）
- **Aino-API origin：** `https://github.com/Ablankpaper/Aino-API.git`
- **Aino-API upstream：** `https://github.com/Wei-Shaw/sub2api.git`

### 依赖版本检查

#### Aino-API
- **Go版本：** `go1.27.0 darwin/arm64`
- **迁移文件：** 239_phone_auth_identity.sql ✅ 存在

---

## A：短信与统一账户

### A1：电话身份、数据库与老用户兼容

**状态：** 本地身份兼容、数据库约束和隐私修复已通过隔离集成与独立复核
**提交SHA：** `95f92b92e`
**提交信息：** `feat(auth): add phone identity support (A1)`

**已实现：**
- ✅ phone_identity.go 和 phone_identity_test.go
- ✅ 数据库迁移 239_phone_auth_identity.sql
- ✅ Ent schema 更新（auth_identity.go, user.go）
- ✅ 单元测试通过（TestNormalizeCNPhone, TestPhonePlaceholderIsNotAContact, TestMaskPhoneE164）

### A2：短信 sender、Redis 原子 challenge 与配置

**状态：** Redis 与认证错误矩阵已通过；官方新版 SDK 与动态管理配置在 A4 完成
**提交SHA：** `0b38dd3c4`
**提交信息：** `feat(sms): implement SMS verification service with Redis cache (A2)`

**已实现：**
- ✅ sms_service.go（SMSService核心逻辑）
- ✅ sms_aliyun.go（阿里云SDK集成）
- ✅ sms_cache.go（Redis原子操作）
- ✅ Wire依赖注入配置
- ✅ 895行代码，包含完整的限流、验证和测试

### A3：登录、已有账户绑定与认证政策

**状态：** 本地实现、真实内部组件集成与独立复核通过，尚未推送/合并
**提交SHA：** `b7f7ed951`

**已实现：**
- ✅ auth_phone_binding.go：BindPhoneIdentity方法
- ✅ auth_service.go：添加ErrPhoneAlreadyBound、ErrPhoneInvalid错误；smsService字段；SetSMSService方法
- ✅ user_service.go：normalizeUserIdentityProvider和canUnbindProvider支持"phone"
- ✅ wire.go：ProvideAuthService注入SMSService
- ✅ `POST /auth/phone/send-code`、`POST /auth/phone/verify`
- ✅ `POST /user/account-bindings/phone/send-code`、`POST /user/account-bindings/phone`
- ✅ challenge proof 的用途、手机号、challenge ID、消费状态校验
- ✅ 绑定接口使用 typed auth subject，并按 step-up 设置执行门控
- ✅ 注册复用协议 revision、邀请码、注册赠送、默认订阅、平台配额与优惠码语义
- ✅ 手机号摘要脱敏，phone-only placeholder email 不出现在普通用户 DTO
- ✅ migration 239 回归测试不再是只设置 sqlmock expectation 的空测试
- ✅ 后端 `go test ./...`、目标 unit tests、`go build ./...` 通过
- ✅ 站点端 `vue-tsc --noEmit`、认证/绑定 Vitest、i18n 完整性、ESLint 通过

**未完成的验收：**
- ⏳ 阿里云短信真实发送（需要正式模板正文、专用凭据和指定接收号码）

**2026-09-15 补充验收：** 真实 PostgreSQL/Redis/JWT/HTTP 链路已执行并通过。包括并发注册与绑定归属、封禁/注册开关/邀请码/协议、TOTP 和敏感操作认证时效、验证码重放与替换、占位邮箱通知/找回边界及供应商/Redis 故障。最终修复提交 `233da912b`，独立复核确认三项重要问题全部解决。

### A4：站点登录、个人资料、短信管理与协议

**状态：** 本地实现与自动回归已完成，独立复核进行中
**提交 SHA：** `26e373626e5de7fbabdcbca25b6f58884fa5fbd9`

**已实现：**
- ✅ 公开设置输出手机号登录/注册/绑定能力、地区和验证码长度
- ✅ 登录页增加手机号模式、发送验证码、倒计时、TOTP 和协议 revision 传递
- ✅ 个人资料登录方式增加手机号绑定表单与脱敏状态
- ✅ 保留现有邮箱/第三方登录链路

**本轮补齐：**
- 管理员短信配置、模板核验、就绪状态、审计与显式测试发送；凭据仍仅在服务端部署配置中。
- 官方 Aliyun v4 SDK，单次发送、总超时和 Redis 失败关闭，不自动重复发码。
- 独立 `/desktop/captcha`，不恢复网站账户，不携带已保存的账户令牌。
- 手机号格式、时效、邀请/协议、二次验证、已有账户入口、绑定冲突与重新登录路径。
- 完整站点回归与稳定构建的桌面/窄屏实际页面检查；两项原有测试失败仍待最终阶段处理。

**本轮验收：** 站点完整 Vitest 为 282 个文件、2,126 项通过，另 2 项旧失败与基线一致；`vue-tsc --noEmit`、完整 ESLint 和 Vite 构建通过。Go 相关包、unit-tag handler、Wire 和服务构建通过；真实 PostgreSQL/Redis 的手机号绑定/短信测试通过。浏览器使用本地 HTTP fixture 实测手机号登录 → TOTP → 个人资料，以及绑定和配置失败保留输入；独立 captcha 请求未带 bearer。上述浏览器测试不代表真实短信送达；原生窗口/nonce 安全边界由 A5 实现并验收。

### A5：Electron 平台账户、令牌与 typed IPC

**状态：** 已有未完成的契约/存储文件，尚未接入原生平台账户

### A6：桌面独立登录窗口与我的账户接线

**状态：** ⏸️ 未开始

---

## B：内置模型与运行时

**状态：** ⏸️ 未开始

---

## C：钱包充值与对账

**状态：** ⏸️ 未开始

---

## D：验收、发布与交付

**状态：** ⏸️ 未开始

---

## 问题和阻塞项

### 当前问题
1. **A4复核中：** 实现及本地验收已有回执，等待独立检查并处理发现的问题
2. **A5/A6、B、C、D尚未开始：** Electron 平台账户、内置模型、钱包充值和最终交付仍不能宣称完成
3. **进度记录更正：** 两仓库 origin 均正确；此前 Aino origin 异常是文档误记，未修改远程配置

### 待确认材料（不阻塞开发）
- [ ] 短信模板完整正文和变量名
- [ ] 短信服务端凭据（AccessKey/AccessSecret）
- [ ] 电信签名验证结果
- [ ] 官方模型分组和价格配置
- [ ] 支付渠道商户配置
- [ ] 协议/隐私政策正文

---

## 更新日志

- **2026-09-14 12:00:** 创建进度文档，Task 0基线检查完成
- **2026-09-14:** A1、A2已提交；Codex完成 A3 和站点端手机号首版，并提交 `b7f7ed951`
- **2026-09-15:** 重新读取两仓库现场，确认 Wire 编译阻塞已修复，开始无缓存回归与隔离 PostgreSQL/Redis 验收；继续保留并完成尚未接线的桌面文件。
- **2026-09-15:** A1-A3 修复与 25 项顶层隔离集成通过，独立复核通过；继续 A4。桌面基线 `npm run build` 通过，包含现有 npm 配置、Vite 弃用和 dirty build-stamp 提示，该构建仅用于本地验收，不是发布制品。
