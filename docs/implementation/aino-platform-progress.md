# Aino 平台一体化实施进度跟踪

**创建日期：** 2026-09-14
**执行者：** Claude Code（前期）与 Codex（复核及续作）
**总计划：** [implementation-plan.md](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)

## 2026-09-15 续作核验

用户已改为由 Codex 继续实施，不再交由 Claude 执行。下表区分已有代码、实际自动测试和真实服务联调；后文历史记录不能替代验收证据。

| 阶段 | 代码状态 | 本轮验证 | 真实服务联调 |
| --- | --- | --- | --- |
| A1-A3 身份、短信、认证 | 本地基础实现与修复已完成，独立复核通过 | 实际 PostgreSQL 18.1 / Redis 8.4 / JWT / HTTP 认证链路 25 项顶层测试及 4 项故障子场景通过；Go 构建与相关包回归通过 | 未进行 |
| A4 站点页面 | 本地实现及两轮修复均已通过独立复核，最新 `f6b8849e0` | 站点 2,133 项通过、保留 2 项已记录旧失败；最终打包修复相关 10 项通过；类型/lint/构建、Go 相关包及真实 PG/Redis 定向集成通过；桌面/窄屏页面已检查 | 未进行 |
| A5 原生平台账户 | 本地实现与四轮定向修复已通过独立复核，最新 `b5bd648df5` | 最新 62 项定向测试、类型及相关 lint 通过；此前完整 Electron 2,223 项通过、6 项原有跳过；实际 macOS 加密保存/重启/退出和原生 IPC 已验证，其他平台单独列待验收 | 未进行 |
| A6 桌面登录接线 | 继续实施 | 页面接线尚未验收 | 未进行 |
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
- API `f6b8849e0` 完整无缓存默认测试 `go test -count=1 ./...` 通过；完整集成 `CI=true go test -tags=integration -count=1 -timeout=10m ./...` 通过，真实 PostgreSQL/Redis 与迁移未跳过。完整 `unit` 标签测试中 55 个包通过，`internal/server` 的 3 条旧契约测试失败：模拟仓库对不存在的设置返回空字符串而非省略，另有旧响应预期未包含新增 phone 字段。已定位并记录待修，未放宽生产配置校验或跳过测试。

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

**状态：** 本地实现、两轮修复与独立复核通过；真实短信未联调
**提交 SHA：** `26e373626e5de7fbabdcbca25b6f58884fa5fbd9`、`f7e106c76034d3abdeb3d11b191d4ab325833ba4`、`f6b8849e0534d8b3cb56988e37356beec2ab273a`

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

**首轮复核修复：** `f7e106c76` 补齐短信地域/请求超时动态设置、保存后的就绪状态刷新、真实变更才触发敏感认证与审计、验证码供应商冲突拒绝、共用手机号 challenge 生命周期，以及无效模板 JSON 阻止保存。六项问题已独立复核通过；相关站点 67 项通过，完整站点更新为 2,133 项通过、2 项原有失败。

**补充实际页面检查：** 无效模板 JSON 未产生设置 PUT；修正后地域/超时准确提交；手机号表单按回车仅验证一次。打包后的独立 captcha 曾额外加载无关 Airwallex SDK，现已将完整 SDK 依赖隔离为支付页面按需加载，实际产物检查和独立复核均通过；最终相关 10 项测试通过。没有创建订单、支付或发送真实短信。

**非阻塞复核记录：** Aliyun sender 的直接 `Send` 在 typed-nil 接收器情况下有防御性 API 回归；真实运行路径使用带 nil 校验的 `SendWithOptions`。已记录在最终全分支复核清单，不隐去。现有构建/测试警告与两项基线失败也继续保留说明。

### A5：Electron 平台账户、令牌与 typed IPC

**状态：** 本地实现与独立复核完成；真实服务及其他操作系统仍待单独验收
**最新已复核 SHA：** `b5bd648df5ec24793a19366b165ad83050206bb1`（初次实现为 `1989bf0c36d62af3be4dd8cd50696978ed68663f`）

主进程账户状态机、平台 HTTP 客户端、独立加密存储、受限制的账户 IPC、验证码窗口与 preload/bundler/类型接线已实现。最初 23 项定向测试及完整 Electron 2,196 项通过，后续复核补齐下列问题。此状态不能代表 A6 页面接线已完成，也不代表真实短信登录已验收。

**首轮修复：** `31a40b6a215f692d0b1b8d77093cd22620622e0d` 修正协议关闭登录、跨窗口广播、旧二次验证与账户切换、退出失败、令牌刷新和网络恢复、严格响应解析、结构化错误传递、验证码超时/网络隔离等问题。50 项定向测试与 2,223 项 Electron 测试通过；真实 Electron 使用本地 HTTP 和实际验证码页面构建验证手机号登录、限流等待秒数、可信窗口同步及非可信页面拒绝。独立复验仍在进行，不能仅凭测试通过宣称阶段完成。

**首轮独立复验结果：** 原 12 项中 11 项已解决；真实请求的令牌刷新合并仍不完整。另复现 4 项并发缺陷：较早的注销覆盖后来登录、注销期间新请求复活旧账户、刷新成功后资料读取暂时失败导致新令牌丢失、验证码初次配置读取期间的旧操作仍可继续。已进入第二轮定向修复，A5 尚未验收通过，不把局部测试通过等同于功能完成。

**第二轮修复与复验：** `4a6bf9ba8eb503e3f9cd510ac3fd20bdf6ad9f4b` 补齐令牌更新归属、刷新恢复和验证码操作时序，并基于隔离 SDK 检查补全阿里云验证码的地区/前缀限定资源地址；57 项定向测试、类型检查、相关 lint 和开发构建通过。独立复验已关闭其中 5 项，仍复现“并发两次注销”与“注销期间新登录失败”的 2 项状态缺陷，第三轮继续处理。

**真实 macOS 本地存储验收：** 使用实际 Aino Electron/main/preload 和独立测试目录、模拟平台账户，通过系统加密保存、`0600` 文件权限、重启恢复同一账户、退出删除令牌及再次重启保持未登录。未使用真实用户凭据或注入假的加密实现；这不代表 Windows/Linux、锁定 Keychain、正式安装包或真实短信已通过。

**最终复核结果：** `369c30a260` 合并同一凭据的并发退出并按凭据归属清理；`b5bd648df5` 将登录失败回退与其捕获的凭据归属绑定，补齐注销与失败登录两种返回顺序，同时保留后来成功登录和有效二次验证。最新 62 项定向测试、类型检查和相关 lint 通过，第四轮独立复核全部通过，无未处理的阻塞项。上述完整 Electron 和 macOS 记录分别对应此前修复提交，未重复宣称为新提交的全量运行；最终跨模块验收仍在 D 阶段执行。

### A6：桌面独立登录窗口与我的账户接线

**状态：** 继续实施，保留独立小窗口与现有我的账户布局

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
1. **A4本地验收已完成：** 真实短信尚未验证；一项非阻塞 sender 边界和已有测试失败留待最终阶段检查
2. **A5已通过复核，A6、B、C、D待完成：** 正在连接实际桌面登录页面；内置模型、钱包充值和最终交付仍不能宣称完成
3. **进度记录更正：** 两仓库 origin 均正确；此前 Aino origin 异常是文档误记，未修改远程配置
4. **完整 Go lint 尚未通过：** 使用 CI 对应的 `golangci-lint v2.13.2` 检出手机号相关代码 7 项问题（2 项格式、4 项静态规范、1 个未使用旧方法）。已列入最终验收的定向修复清单，未忽略或关闭检查；不影响此前已通过测试的事实，但完整质量门禁仍未完成。
5. **完整 unit 契约测试需补齐：** 管理员设置夹具与真实仓库行为不一致、响应预期缺少新增手机号字段，3 条失败已定位；默认和真实数据库集成命令通过，不替代这项待修门禁。

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
- **2026-09-15:** A4 原实现与两轮修复均通过独立复核；开始 A5 主进程平台账户。既有站点功能、用户数据和桌面 UI 保持，未推送或进行线上操作。
- **2026-09-15:** A5 四轮定向修复完成并通过独立复核，补齐 macOS 实际加密存储回执；API 完整默认/集成通过，unit 契约失败和 lint 待修明确记录。继续 A6 页面接线。
