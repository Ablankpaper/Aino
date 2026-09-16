# Aino 平台一体化实施进度跟踪

**创建日期：** 2026-09-14
**执行者：** Claude Code（前期）与 Codex（复核及续作）
**总计划：** [implementation-plan.md](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)

## 2026-09-16 Codex 接手续作

用户已暂停 Claude，后续由 Codex 按 B5 → B6 → C → D 串行开发，不启用子智能体。保留下面的历史交接记录，但其中“交给 Claude”的安排已失效。

- B5 本地实现、相关验收完成，随本次阶段提交保存；Aino-API 仍为 `9de47dab17de239a3735963a7339c254e34878d7`，本轮没有 API 改动。
- 平台主回答/标题/压缩/视觉/子任务继承相同授权和费用来源；BYOK 独立，缺失自定义配置不能自动发现其他付费提供商。
- 每个实际 HTTP 请求携带独立 call ID，同回合共享 turn ID；压缩续接和工作区恢复保持计费会话 ID，显式分支分开。回复仅记录 `pending` 关联元数据，不冒充已结算费用。
- 过期、撤销、上游鉴权、余额/订阅不足分类；不重放整轮，不重建 prompt 来续租。短时平台授权不能被保存为无人值守定时任务的凭据。
- 最新相关回归 131 文件/1,388 项通过；B4/B5 定向 49 项通过；桌面通知 21 项、类型检查、相关 Ruff/ESLint、构建及 diff 检查通过。详见 [B5 验收记录](aino-platform-b5-review.md)。
- B6 模型 UI、C 钱包充值/真实消费对账、D 完整交付仍未完成。真实短信、模型收费、支付及 Windows/Linux 仍未验收。
- 较大范围 Python 回归为 8,976 通过、4 失败、29 跳过，另 1 文件超时。本次计费关联失败已修复并复验；其他失败/超时单独列入 D，不以局部通过宣称整体全绿。
- 无推送、main 合并、生产部署、真实付费操作，也没有打开 Qoder 或其他 IDE。

## 2026-09-15 续作核验

最新安排：Codex 已补齐并提交 B4，后续由用户转交 Claude 完成 B5–B6、C、D。执行入口为 [Claude 交接清单](aino-platform-claude-handoff.md)。下表区分已有代码、实际自动测试和真实服务联调；后文历史记录不能替代验收证据。

当前配对：Aino B4 `f46af0c914`（保留 B3 及 Claude 的 B4 草稿并补齐）；Aino-API `9de47dab1`。交接文档提交位于 B4 之后。均为本地特性分支，未推送/合并/部署。

| 阶段 | 代码状态 | 本轮验证 | 真实服务联调 |
| --- | --- | --- | --- |
| A1-A3 身份、短信、认证 | 本地基础实现与修复已完成，独立复核通过 | 实际 PostgreSQL 18.1 / Redis 8.4 / JWT / HTTP 认证链路 25 项顶层测试及 4 项故障子场景通过；Go 构建与相关包回归通过 | 未进行 |
| A4 站点页面 | 本地实现及两轮修复均已通过独立复核，最新 `f6b8849e0` | 站点 2,133 项通过、保留 2 项已记录旧失败；最终打包修复相关 10 项通过；类型/lint/构建、Go 相关包及真实 PG/Redis 定向集成通过；桌面/窄屏页面已检查 | 未进行 |
| A5 原生平台账户 | 本地实现与四轮定向修复已通过独立复核，最新 `b5bd648df5` | 最新 62 项定向测试、类型及相关 lint 通过；此前完整 Electron 2,223 项通过、6 项原有跳过；实际 macOS 加密保存/重启/退出和原生 IPC 已验证，其他平台单独列待验收 | 未进行 |
| A6 桌面登录接线 | 本地实现与复核完成，`ba76603774` | 7,835 项 UI、2,237 项 Electron、类型检查、相关 lint、构建及原生隔离登录流程通过 | 未进行 |
| B1 目录与权限 | Claude 本地提交 `b180a8519` | 目录相关 Go/站点测试；B2 验收中重跑真实目录集成通过 | 未进行 |
| B2 推理凭据 | Codex 补全并提交 `9de47dab1` | Ent/Wire 可离线生成且无漂移；9 项 B2 顶层真实 PG/Redis/HTTP 场景通过，含 B1/PhoneFlow 的 24 项组合通过；构建、相关 unit/UI 测试和新增代码 lint 通过 | 未进行 |
| B3 可信会话绑定 | Codex 补齐并提交 `3b4d5d9e3f` | 网关 1,090 项、Electron 相关 440 项、账户/入口 UI 16 项、共享 RPC 19 项、类型检查和构建通过；最后局部修正另有定向复验，详见 B3 记录 | 未进行 |
| B4 Agent 运行时 | Codex 补齐并提交 `f46af0c914` | 125 文件/1,111 项网关及 provider 回归、平台相关 Electron 73 项、类型检查、相关 lint、构建通过；12 项真实 Agent 场景包含三协议工具往返、续租、恢复、取消、切换与 profile | 未进行 |
| B5 辅助调用费用；B6 模型 UI | 尚未实施 | 未运行 | 未进行 |
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
- Aino `6045655178` 内置模型接入前的 Python 网关基线：`scripts/run_tests.sh -j 3 tests/tui_gateway/`，120 个文件、1,085 项通过，0 失败，62.7 秒。
- 同一未改动 Python 基线的核心/插件测试：`scripts/run_tests.sh -j 3 tests/agent/ tests/plugins/`，634 个文件、8,278 项通过、2 项失败、28 项跳过，321.0 秒。两项失败都在 Hindsight 作用域测试夹具：它使用假的客户端，但遗漏了可选依赖准备的隔离，实际安装保护在客户端创建前拒绝执行。另有一项 Codex 辅助请求 FD 归属测试因定时器与主线程先后顺序不固定，重试后通过。这些旧测试问题已记录在最终验收定向修复清单；未安装外部记忆服务、未放宽运行时保护或跳过失败。
- 同一未改动 Python 基线的 CLI 测试：`scripts/run_tests.sh -j 3 tests/hermes_cli/`，850 个文件、9,123 项通过、1 项失败、181 项跳过，389.4 秒。失败夹具只替换 SQLite 查找结果，却保留了实际环境的旧拒绝原因，导致“未安装”场景误走“不安全版本”分支；已记录最终验收需完善夹具，保留真实 SQLite 安全检查。

已修复并复核：绑定响应仅返回安全 DTO；验证码关联具体登录会话且新码使旧码失效；所有短信限流返回 `Retry-After`；绑定/解绑校验近期实际认证和 TOTP；并发手机号归属、占位邮箱隐私与故障关闭均有真实链路测试。API 修复提交为 `02244316c`、`9390af97b`、`b745b100d`、`233da912b`。后续 A4 继续补配置、官方 SDK 和网站体验，不代表短信已真实发送验证。

## B3 补齐（2026-09-15）

已实现主进程真实鉴权请求、B1/B2 路由/DTO、已有连接解析、一次性会话委托、主进程专用 WS、远程确认、revision/账户竞态控制，以及网关 session/transport/expiry 清理。异常 WS 帧的日志不再包含原文。详见 [B3 验收记录](aino-platform-b3-review.md) 和 [Claude 接续入口](aino-platform-claude-handoff.md)。

一次 ASGI 测试上下文关闭等待被主动停止，已改为真实 loopback socket、事件同步和有限超时；当前真实 WS 测试通过，无原样盲目重试。整体 CI 旧问题没有在此轮重复清理；不是平台全功能验收。当时 B4–B6/C/D 待做；B4 的最新完成状态见下一节。

## B4 补齐（2026-09-15）

提交：`f46af0c914`。详见 [B4 验收记录](aino-platform-b4-review.md)。

已完成草稿等待凭据、真实 provider/Agent/SDK 接线、三协议流式工具往返、运行时内存认证、自动续租、四种历史恢复、公开身份持久化、分支/profile、显式平台/BYOK 切换和取消。未绑定不请求、不落空会话行；续租保持 prompt/history/tools；历史原账户与费用来源不变。沿用现有配置切换确认入口，未增加模型选择 UI。

验证命令与结果：

- `scripts/run_tests.sh -j 3 --file-timeout 45 --file-retries 0 tests/tui_gateway/ tests/plugins/test_aino_provider.py --tb=short --show-capture=no`：最终 125 文件、1,111 项通过、0 失败，70.3 秒。
- provider/runtime/绑定/真实 Agent 定向组合：25 项通过，含 12 项真实 Agent 场景。
- `npm run test:desktop:platforms -- electron/platform`：7 文件、73 项通过。
- `npm run typecheck`、`npm run build`、本轮 Python Ruff、相关 Electron ESLint（max-warnings=0）、`git diff --check` 通过。

首次网关回归为 1,109 通过、1 失败，原因为新增测试读取了已创建尚未启动的线程句柄；锁内读取修复后定向及最终回归通过。另有测试夹具最初漏等异步 RPC、漏释放真实会话 lease，均按实际生命周期修正，没有跳过测试或反复原样重跑。日志在 `/tmp/aino-b4-validation.Sl2M2D/`，不提交临时文件。

本轮 API 无改动、未重复跑 Go；无新模型 UI，不重复完整 UI 套件。B5/B6/C/D 与之前记录的全量 CI 旧问题继续由 Claude 完成。跨仓库真实账本、正式模型收费/短信/支付、Windows/Linux 和真实远程连接未验收；不能宣布整个平台或“登录即聊”已经上线。

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

**状态：** 本地实现、测试与复核完成；保留独立小窗口与现有我的账户布局
**提交 SHA：** `ba76603774`

已接通平台账户、手机号/已有账户/TOTP 登录、我的账户与左下角用户名，多窗口同步及退出恢复。商业账户独立于 Agent 连接和工作区。禁用人机验证时不再打开验证窗口；显式本地旧账户适配器不能成为生产失败后的 fallback。

**已获得验收：** 7,835 项 UI、2,237 项 Electron 测试通过；类型检查、相关文件 lint、构建和一条真实 Electron/main/preload 的隔离登录流程通过。复核已通过（用户接续记录）。实际短信、正式验证码供应商以及 Windows/Linux 安全存储仍未验收；既有全量门禁问题保留在 D 阶段。

---

## B：内置模型与运行时

**状态：** B1、B2 本地实现完成；B3–B6 待实施，尚不能在桌面直接使用内置模型聊天

### B1：官方模型目录与 bootstrap

**状态：** 本地实现、测试与复核完成
**提交 SHA：** `b180a8519` (Aino-API)

**已实现：**
- ✅ DesktopModelService: Bootstrap(), ListForUser(), ResolveForUser() 方法
- ✅ DesktopSettings 配置模型与验证持久化
- ✅ 路由: GET /api/v1/desktop/bootstrap, GET /api/v1/desktop/models
- ✅ DesktopModelsSection.vue 管理员 UI 组件
- ✅ 与 APIKeyService、BillingService、ModelPricingResolver、BillingCacheService 集成

**已获得验收：**
- 6 项单元测试通过：settings 默认值、round-trip、权限边界、composite routing、bootstrap 默认值、auth 要求
- 2 项集成测试通过（PostgreSQL/Redis/JWT fixtures）：真实权限过滤和订阅、真实 channel pricing 匹配账本
- 2 项前端测试通过：DesktopModelsSection.spec.ts
- Backend 编译、类型检查、frontend 类型检查全部通过
- 29 个文件改动，1,332 行新增

**设计合规：**
- 永不扩大用户权限超出实际分组权限
- 在返回目录条目前强制执行分组模型 allowlist
- 从现有分组费率计算定价（无独立价格表）
- 返回适用性状态：available/insufficient_balance/quota_exhausted/unavailable 及原因码
- 公开设置暴露 desktop_enabled 能力，不泄露私有目录

### B2：用户专属推理凭据与撤销

**状态：** 本地实现、定向验收和本地提交完成；无线上调用
**提交 SHA：** `9de47dab1`（Aino-API）

- 修复 Ent 下载/缺失校验和、编译与 Wire 接线；使用原锁定版本，未降级 Go 或关闭校验。生成物完整入库，二次生成哈希一致。
- 原子创建 APIKey 和租约、用户行锁、活动作用域唯一约束；相同授权并发复用、按配置 TTL 续租、到期更换，期限不超过存活 refresh session。
- 实际注销、revoke-all、密码/身份/禁用、设备撤销均已接线，删除 TODO。缓存命中后仍重验租约/父会话/用户/分组；普通网站 Key 保留原语义。
- Redis 原子轮转及撤销墓碑，旧 refresh hash 可定位家族用于竞争中的退出；非空历史集合不能替代存活 token。禁用再启用后旧 JWT 换 grant 也不能复活，新登录可取得新凭据。
- 托管 Key 明确标记；通用 DTO 隐去秘密，网站禁用复制/导出/编辑/换组/重新启用，仅保留删除；只允许列明的 `/v1` 推理/模型/用量入口，拒绝其他入口与跨组 fallback。
- `POST /api/v1/desktop/credentials`、`GET /api/v1/desktop/devices`、`DELETE /api/v1/desktop/devices/:device_id` 使用现有 JWT 主体。设备撤销要求近期认证或既有 TOTP step-up。秘密响应 `no-store`，不进入通用幂等 response cache。

**证据（2026-09-15）：**

- `go test -tags=integration ./internal/repository -run 'DesktopLease|DesktopCatalog|PhoneFlow' -count=1 -timeout=180s -v`：24 项顶层场景通过，9.394 秒；实际 PostgreSQL 18.1 / Redis 8.4。
- 补充 HTTP 并发、旧 JWT/新登录、近期认证、普通 Key 编辑断言后，`-run DesktopLease`：9 项顶层场景通过，4.854 秒。
- 相关 `unit` 标签认证/Key/Phone/Desktop：service 及 handler/dto/admin/middleware/routes 通过；包含托管秘密 DTO 和跨计费组 fallback 合同。
- 默认 Go 全仓运行其余包通过，新增 Google 鉴权缺少 import 导致 9 个相关包首次编译失败；修复后对这些包运行完整默认测试全部通过。未将首次失败写成全量绿，最终 D 阶段需再跑一条完整命令。
- Go 服务构建通过；本轮改动 `golangci-lint --new-from-rev` 为 0 项。全量 lint 仍有原有 7 项手机号问题，不计为已解决。
- 站点 KeysView + locale 16 项通过；`vue-tsc -b`、相关 ESLint、Vite 构建通过。未重复运行无改动桌面 7,835/2,237 项测试。
- Playwright 隔离页面 `http://127.0.0.1:5197/keys`（1280×720）：托管行仅删除、普通行全部原操作；点击托管删除出现正确确认，未确认删除；最终页面无控制台错误。早期测试夹具误拦截源码导致空白，已定位并缩窄拦截。此浏览器数据为替身，不替代真实后端测试。

本机日志：`/tmp/aino-b2-validation.Bc4bcf/`；截图 `.playwright-cli/page-2026-09-15T06-04-11-112Z.png` 位于该目录。临时材料未提交。

新增 SQL 为 `240_desktop_model_credentials.sql` 和 `241_desktop_credential_identity_revocation.sql`，已应用于隔离测试。后续 C2/C3 迁移编号至少从 242 开始并检查占用，不能照抄原计划编号覆盖 241。

此节为 B2 历史记录；B3/B4 已完成，下一步从 B5 继续，详见交接清单。

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
2. **A1–A6、B1–B4 本地完成，B5–B6、C、D待完成：** 从 B5 继续；桌面内置模型选择、辅助调用费用、钱包充值和最终交付仍不能宣称完成
3. **进度记录更正：** 两仓库 origin 均正确；此前 Aino origin 异常是文档误记，未修改远程配置
4. **完整 Go lint 尚未通过：** 使用 CI 对应的 `golangci-lint v2.13.2` 检出手机号相关代码 7 项问题（2 项格式、4 项静态规范、1 个未使用旧方法）。已列入最终验收的定向修复清单，未忽略或关闭检查；不影响此前已通过测试的事实，但完整质量门禁仍未完成。
5. **完整 unit 契约测试需补齐：** 管理员设置夹具与真实仓库行为不一致、响应预期缺少新增手机号字段，3 条失败已定位；默认和真实数据库集成命令通过，不替代这项待修门禁。
6. **Python 核心/插件基线有待修测试：** Hindsight 两项依赖隔离遗漏和一项 Codex 定时器先后顺序不稳定已记录，属于修改内置模型前复现的旧问题；最终验收仍需处理并回归，不能称全量 Python 已通过。

### 待确认材料（不阻塞开发）
- [ ] 短信模板完整正文和变量名
- [ ] 短信服务端凭据（AccessKey/AccessSecret）
- [ ] 电信签名验证结果
- [ ] 官方模型分组和价格配置
- [ ] 支付渠道商户配置
- [ ] 协议/隐私政策正文

---

## 更新日志

- **2026-09-15 接续：** 按用户交接确认 A6 已完成，当前 Aino 为 `ba76603774`、API 为 `f6b8849e0`；两仓库特性分支继续，从 B1 开始。卡住的验证记入最终清单，保留已有通过证据，不盲目重复。
- **2026-09-14 12:00:** 创建进度文档，Task 0基线检查完成
- **2026-09-14:** A1、A2已提交；Codex完成 A3 和站点端手机号首版，并提交 `b7f7ed951`
- **2026-09-15:** 重新读取两仓库现场，确认 Wire 编译阻塞已修复，开始无缓存回归与隔离 PostgreSQL/Redis 验收；继续保留并完成尚未接线的桌面文件。
- **2026-09-15:** A1-A3 修复与 25 项顶层隔离集成通过，独立复核通过；继续 A4。桌面基线 `npm run build` 通过，包含现有 npm 配置、Vite 弃用和 dirty build-stamp 提示，该构建仅用于本地验收，不是发布制品。
- **2026-09-15:** A4 原实现与两轮修复均通过独立复核；开始 A5 主进程平台账户。既有站点功能、用户数据和桌面 UI 保持，未推送或进行线上操作。
- **2026-09-15:** A5 四轮定向修复完成并通过独立复核，补齐 macOS 实际加密存储回执；API 完整默认/集成通过，unit 契约失败和 lint 待修明确记录。继续 A6 页面接线。
