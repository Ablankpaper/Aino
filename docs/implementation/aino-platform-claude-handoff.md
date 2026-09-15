# Aino 平台功能：B4 补齐后交给 Claude 的任务

日期：2026-09-15。本文是接续实施指令，不代表整个平台功能已经完成。

## 可直接交给 Claude 的指令

请完整阅读以下文件及其中引用的设计与 A/B/C/D 四份子计划，然后从 **B5** 开始完成剩余本地实现、测试和交付：

1. `/Users/zizimutou/Protect/Aino/docs/implementation/aino-platform-claude-handoff.md`（本文）
2. `/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md`
3. `/Users/zizimutou/Protect/Aino/docs/aino-platform/design.md`
4. `/Users/zizimutou/Protect/Aino/docs/aino-platform/01-identity.md`
5. `/Users/zizimutou/Protect/Aino/docs/aino-platform/02-models.md`
6. `/Users/zizimutou/Protect/Aino/docs/aino-platform/03-billing.md`
7. `/Users/zizimutou/Protect/Aino/docs/aino-platform/04-delivery.md`
8. `/Users/zizimutou/Protect/Aino/docs/implementation/aino-platform-progress.md`
9. `/Users/zizimutou/Protect/Aino/docs/implementation/aino-platform-b4-review.md`

执行前核对两仓库实际分支、最新提交和未提交改动，不覆盖任何已有工作。保留已完成的 A1–A6、B1–B4；不要从账户阶段重新实施，也不要重新解决已经完成的 Ent 下载问题。

按 B5 → B6 → C1–C4 → D1–D4 逐项实施、行为测试、复核、本地小提交。当前按用户偏好串行推进，不开子智能体。验证遇到同一环境问题，在没有新证据时不要盲目循环；记录命令、失败原因和人工验收项，继续不依赖该阻塞的工作。不得用跳过、固定结果或全 mock 替代真实内部链路。

只做本地开发与隔离验收。未经用户后续明确授权，不推送、不合并 main、不部署生产、不发真实短信、不调用付费模型、不实际付款。不要读取其他 IDE/工作区寻找生产秘密。完成后更新配对 SHA、进度、交付/部署/回退文档和待人工验收清单，交回用户，由 Codex 最后查漏补缺。

## 已完成的接续基线

| 仓库 | 路径 | 分支 | 可核对基线 |
| --- | --- | --- | --- |
| Aino | `/Users/zizimutou/Protect/Aino` | `codex/aino-platform-identity-models-billing` | B4 `f46af0c914`，交接文档在其后；启动时读取实际 HEAD |
| Aino-API | `/Users/zizimutou/Protect/Aino-API` | 同名分支 | B1 `b180a8519`；B2 `9de47dab17de239a3735963a7339c254e34878d7` |

A1–A6 已完成本地账户/短信身份/桌面安全存储/独立登录窗口接线。真实短信、人机验证、Windows/Linux 安全存储并未完成正式验收。

B2 已解决代码生成、Wire、原实现编译错误、无效时间索引、事务及并发唯一性、真实撤销钩子、缓存命中后鉴权、父会话轮转/注销竞态和通用密钥编辑/秘密出口。生成物已经提交；大部分新增行来自 Ent 自动生成，不能手工删掉生成文件以缩小 diff。

## B5–B6 必须使用的实际接口

账户 API origin 是 `https://api.agentera.com.cn`，前缀 `/api/v1`。本地测试应使用隔离 HTTP fixture，不向正式服务试错。

| 路由 | 鉴权与输入 | 输出/边界 |
| --- | --- | --- |
| `GET /desktop/bootstrap` | 现有账户 JWT | B1 元数据、默认模型 ID；不创建推理 Key |
| `GET /desktop/models` | 现有账户 JWT | 服务端权限过滤的模型目录与真实价格来源 |
| `POST /desktop/credentials` | JWT；`device_id`、`connection_grant_id`、`model_id` | `credential_id` 字符串、`api_key`、`base_url`、RFC3339 `expires_at`、当前 `model` DTO |
| `GET /desktop/devices` | JWT 主体 | 数组：`device_id`、`last_used_at`、`expires_at`、`revoked`；没有密钥 |
| `DELETE /desktop/devices/:device_id` | JWT；近期认证，无近期认证时重新登录；已启用 TOTP 使用既有 step-up | 撤销设备关联父登录会话及密钥，返回 `revoked: true` |

- API 使用现有 `{code,message,data}` envelope。模型 DTO 以 `backend/internal/service/desktop_models.go` 为准，不凭文档猜字段。
- `device_id` 和 `connection_grant_id` 必须是非零、规范小写 UUID。用户/family/group/额度由服务端决定，客户端不能指定。
- 租约作用域是 user + device + connection grant + session family + group。一个授权下同组目录模型可复用同一凭据，切换组会得到独立凭据；`model` 响应总是本次请求的目录项，不能把首个租约的 model_id 当作永久当前模型。
- TTL 由 `desktop.credential_ttl_seconds` 配置（300–3600 秒），不超过实际存活 refresh token；前 1/3 生命周期内复用，之后同 Key 续租，到期后换 Key。main 根据返回的到期时间管理，不能假定永久有效。
- 退出/设备撤销后，旧 JWT 即使未到期也不能换 grant 重签。身份变化后的旧租约不复活，重新登录使用新 family。
- 托管响应 `Cache-Control: no-store`。**秘密仅由 Electron main 接收**；不通过 renderer bridge、不写配置/日志/会话 DB。普通 `/keys` DTO 的托管 `key` 是空字符串，不能依赖该接口读取凭据。
- 推理 base URL 当前为 `https://api.agentera.com.cn/v1`。允许的入口：POST chat/completions、responses、messages、messages/count_tokens；GET models、models/:model、usage、sub2api/billing，均在 `/v1` 下。不支持托管凭据的 WebSocket、Gemini 原生、图片接口或其他别名；不能把这种限制理解为对应普通 BYOK 功能被移除。
- 托管鉴权错误是 `DESKTOP_CREDENTIAL_EXPIRED` / `DESKTOP_CREDENTIAL_REVOKED`（401）、`DESKTOP_AUTH_UNAVAILABLE`（503）、`DESKTOP_CREDENTIAL_SCOPE`（403）；签发端还会返回 B1 模型/余额/权限原因码。和上游模型自己的 401 区分，不能一律自动注销或无限重试。
- 固定计费组不能被 fallback 改写；费用仍由原有 APIKey/分组/账本链路执行。

## B3 已交付的契约与续作注意

B3 代码为 `3b4d5d9e3f`。修复了原提交的取 token 错位、错误 HTTP 路由/DTO、主进程占位发送、会话归属 TODO、过期/旧请求/退出清理及秘密错误出口。复用了真实 `createPlatformAuth` 的受保护请求和 `JsonRpcGatewayClient`；不能恢复 `account.accessToken` 或全局默认 Key 的做法。

1. UI 接入口是 `apps/desktop/src/api/platform-models.ts: bindPlatformModel(input, snapshot)`。它用 `requestGatewayForAgent` 在该会话已有的聊天 socket 上申请一次性授权，再调用 main bridge。B6 应在创建/恢复平台草稿后、发送前接这个入口，不要直接造 ticket，也不要重新实现网络代理。
2. `platformModels.owner(revision)` 只返回 main 确认的公开账户作用域；`bind` 比原文档多一个 `session_ticket`。顺序为 `session.managed_model_ticket → session.claim_managed_model → POST /desktop/credentials → session.bind_managed_model`。聊天 socket 与 main socket 是两条连接，不能简单把二者当作同一个 transport。
3. ticket 60 秒、单次消费，绑定真实 live session 对象、原聊天 transport、profile/source、模型和平台 owner；main claim 的网关认证主体必须与原 transport 一致。公开 session ID 和 revision 都不是凭据。超过 ticket 有效期必须由现有会话重新申请，不能复用旧票无限重试。
4. `binding_revision` 由 gateway 单调生成，与 `expected_account_revision` 不同。异步绑定检查账户 generation、用户、窗口意图和连接配置；旧 clear 只影响对应 revision。
5. `ManagedModelBinding.model` 是实际模型字符串，`api_mode/capabilities` 来自 B2 的嵌套 `model` DTO；`expires_at` 已解析为带时区 datetime；`api_key` 不进入 repr。B4 从 `get_registry().get(runtime_session_id, live_session)` 获取内存绑定，不能按 model_id 当作会话 ID，也不能保存整个 binding。
6. 更新 ticket 不移除有效的旧 lease；新 lease 验证通过后替换。同一模型/账户续租可在回合中进行，正在运行的会话不能借此切换模型或账户。**B4 已实现自动续租、callable Key 和历史恢复**。`session.renew_managed_model` 只接受当前有效 controller 的同 revision/owner/model/protocol/endpoint，不能认领新会话或复活过期授权。首次/重连仍必须 ticket/claim。
7. main 使用已有安装 UUID 作为 device_id，连接授权使用规范 UUID；同一会话的已连接可信 socket 续租复用 grant。信任只在当前账户与准确连接存活期间保留，新的远程 socket 会显示原生主机/额度确认，不持久化“永远信任”。OAuth 每次新 dial 获取新 ws-ticket；明文远程拒绝，既有 SSH 隧道允许。账户、连接、OAuth 主体改变、窗口关闭/退出会撤销本地绑定。
8. 关闭平台会话或切回 BYOK 时，B6 应调用 `platformModels.clear({connection_id,profile,session_id})` 释放 main 的连接。网关已在 session pop、transport disconnect、到期和显式 BYOK 切换时移除绑定；这些不清钱包。
9. `platformModels.list()` 返回完整公开模型/价格/能力字段；错误通过安全 IPC envelope 抛出，不能将网络失败画成“空目录”。绑定成功返回 `{ok:true,ready:true,model_id,billing_source:'aino',expires_at}`；不返回 Key、JWT 或网关 URL。
10. 本地 HTTP fixture 与正式 origin 隔离：main 要求 lease.base_url 等于配置的平台 origin + `/v1`。当前 Go B2 固定返回正式 base_url；D 的跨仓库本地闭环需要以受控开发配置解决，不能放宽正式来源校验或把测试请求发向生产。

B4 已消费绑定：平台草稿等待凭据，绑定后首次发送构建真实 Agent。三种协议均通过本地流式工具往返。
`info.model_status` 为 `awaiting_managed_credentials` 或 `ready`；未就绪 `prompt.submit` 返回 4410/data.reason，消息未排队。
不要仅据 `ready:true` 宣布“登录即可聊”交付，B5 费用继承与 B6 选择 UI 尚未完成。

平台选中模型变更使用原 `config.set`：`{session_id,key:"model",value:目录ID,model_source:"aino"}`；有历史时按原 `confirm_required` 流程确认并重发 `confirm_expensive_model:true`，随后 B3 重绑。回合运行/构建中明确拒绝切换，UI 保持当前选择并提供完成后重试。切回自定义模型沿用原显式 provider 会话选择，同时 clear main。

B4 的实际边界及测试见 [B4 验收记录](aino-platform-b4-review.md)。`managed_session.py` 是平台选择/运行时模块。
租约不可序列化给 compute-host，历史崩溃不自动重发付费请求。B5 继续补并发子任务和辅助线程的租约引用及费用关联。

B3 验收证据见 [B3 验收记录](aino-platform-b3-review.md)。这轮未启动 Qoder、未做付费请求、未推送/合并/部署。原生远程确认在五语言字典中实现，真正的远程 TLS/SSH/平台认证联调及 Windows/Linux 验证由 D 列表执行。

## 剩余实施顺序与完成标准

| 任务 | 要做的事 | 关键验收 |
| --- | --- | --- |
| B5 | 标题、压缩、视觉、子任务和 fallback 的费用来源继承；每次 HTTP 调用可对账 | BYOK 不暗中用平台 Key；并发/线程正确传递；过期有限重试，工具副作用和已输出回答不重放 |
| B6 | 模型设置、输入框和空白首页共用平台/自定义模型选择 | 原功能全部保留；旧用户显式 BYOK 不覆盖；新用户按服务端默认选择；价格/能力不硬编码；四语言 |
| C1 | 复用原余额/订阅/金额计算，提供钱包和只读报价 | 十进制字符串；USD 账本与支付币种分开；quote 不建单；与实际下单计算一致 |
| C2 | 服务端记录并过滤 session/turn/call/purpose，桌面回复显示实际消费 | 仅托管 Key 接受关联头且不外传；跨用户隔离；真实账本匹配；未结算不显示假 0 |
| C3 | 为现有订单增加持久 client_order_id、规范请求 hash、创建/恢复 lease | 相同意图只有一单；渠道超时恢复同 out_trade_no；重复/乱序回调一次入账；旧网站兼容 |
| C4 | 我的账户增加钱包、消费、订单、设备和充值恢复 | 关闭二维码不取消；PAID 不当 COMPLETED；账户切换清缓存；有限轮询；安全打开支付 URL |
| D | 跨仓库隔离闭环、旧数据升级、回归、部署/回退及真实验收清单 | 登录→工具往返→真实本地账本→签名支付回调→一次入账→桌面刷新；随后 BYOK 无平台扣费 |

B5–B6 是桌面“登录即可选内置模型聊天”仍然缺失的部分；当前 B1–B4 的通过不代表此用户功能已经可用。C 未实施，不能宣布充值可用。

## 已获得的验证与不要重复踩的坑

- B4 最终网关及 provider 回归：125 文件、1,111 项通过、0 失败；平台 Electron 7 文件/73 项、typecheck/build/相关 lint 通过。
- 真实 Agent 协议替身与 RPC 测试可复用 `tests/tui_gateway/test_managed_model_agent.py` 和 `managed_protocol_fixture.py`。
  测试必须等待实际 turn worker，`prompt.submit` 的 deferred waiter 还会移交线程；RPC `session.resume` 是异步响应。
  会话清理必须走 close/teardown，不能只 pop 后遗留 active_session_lease。Python 仍使用 `scripts/run_tests.sh`。
- 本轮没有使用子智能体，没有启动其他 IDE 或真实桌面账户测试；临时本地日志在 `/tmp/aino-b4-validation.Sl2M2D/`。

- B2 的 9 项顶层真实 PostgreSQL/Redis/HTTP 集成通过，覆盖 HTTP 并发唯一、续租/过期、注销/旧 JWT、设备归属/近期认证、密码/禁用后重启用、新登录、事务回滚、轮转竞态、分组/模型/端点限制、父会话存活和故障关闭。
- B2 + B1 + PhoneFlow 的 24 项顶层组合通过；service/handler/admin/dto/middleware/routes 的相关 unit 标签测试通过。
- 默认 Go 全仓测试首次被新增 Google 中间件缺少 import 阻断；已修复并复验全部 9 个受影响包，其余包在全仓运行通过。D 最终应重新执行完整默认命令，不把这条失败日志写成全绿。
- Ent/Wire 已成功生成，再生成内容哈希无变化；Go server 构建通过；新增代码 lint 0 问题。
- 网站相关 Vitest/locale 共 16 项通过，vue-tsc、相关 ESLint、Vite build 通过。浏览器 1280×720 显示正确的托管/普通操作差异并打开删除确认，最终无 console error；数据是隔离 fixture，未操作线上 Key。
- 日志和截图临时目录 `/tmp/aino-b2-validation.Bc4bcf/`。`go-b2-final.log`、`go-integration-final.log`、`go-unit.log`（service 通过，其他包在后续日志复验）、`go-unit-final.log`、`go-default.log`、`go-default-affected-final.log`、`go-lint-diff.log`、`frontend-build.log` 可核对；临时目录可能被系统清理，关键结论已记入进度文档。
- 当前机器已缓存 Go 1.27 和 Ent 依赖。可用下列工具链；不要降级 Go、不关闭 sumdb、不在网络超时后反复原样执行：

```sh
# 工作目录 /Users/zizimutou/Protect/Aino-API/backend
export AINO_PLATFORM_GO=/Users/zizimutou/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.27.0.darwin-arm64/bin/go
GOTOOLCHAIN=local GOPROXY=off "$AINO_PLATFORM_GO" generate ./ent ./cmd/server
GOTOOLCHAIN=local GOPROXY=off CI=true "$AINO_PLATFORM_GO" test -tags=integration ./internal/repository -run DesktopLease -count=1 -timeout=120s
```

确有新增未缓存依赖时，先确认原因，可将单次命令 GOPROXY 改为本次验证可达的 `https://goproxy.cn`；保留版本和校验。不全局改机器 Go 配置。

- 本机 pnpm 11 可能在 exec 时重解依赖并改写锁文件。本轮无意漂移已恢复；优先使用项目已安装的 `./node_modules/.bin/vitest`、`vue-tsc`、`eslint`、`vite`，不要混入升级。
- Python 只能用 Aino 的 `scripts/run_tests.sh`。修改相应目录前读其 AGENTS；桌面不要再选 Electron demo，也不要操作 Qoder。真实 Aino Electron 路径见 D2。

## D 阶段必须收尾的已知问题

1. 站点基线两个失败：`ChannelMonitorView.grok.spec.ts` 固定提供商数量、`GroupsView.codexManifest.spec.ts` 缺少 Pinia 初始化。修复真实夹具/行为断言，不用 skip。
2. Go unit 基线 server 三项契约：设置仓库替身对不存在的键返回空字符串而非省略；预期响应缺新增手机号字段。最终数量以实际回归为准。
3. Go 全量 lint 原有七项：sms_cache/auth_phone 的格式规则；setting_sms 冗余嵌入字段选择；sms_aliyun 三处错误文案大写；user_handler 未使用旧 step-up 方法。另有 Aliyun sender typed-nil 直接 Send 边界，具体范围见进度历史。
4. Python 基线：Hindsight 两项可选依赖夹具隔离，Codex 辅助请求 FD 定时器竞态，SQLite 发现夹具残留旧拒绝原因。保留生产安全检查。
5. 真实短信送达/三网、正式人机验证、Windows/Linux 安全存储、正式安装包、各模型工具能力与实际扣费、小额支付都未完成，按用户授权再验收。

## 迁移、部署与回退注意

- 新增 240、241 已应用于本地隔离数据库。**不要修改这两个 SQL 的内容**；后续 C2/C3 的示例编号已冲突，从下一可用编号顺延（当前至少 242）。
- 240 新建托管关联和字段；241 在身份/状态改变时撤销托管记录并禁用托管 Key。原 key invalidation outbox 被复用，不另建缓存失效队列。
- `desktop.enabled` 默认关闭、目录默认空。不得把 `fixture-*` 或未经实际验证的模型标成正式可用。
- 服务端回退不能直接换回不识别托管标记/不校验租约的旧二进制，否则仍存活的 Key 会失去租约保护。必须先停止签发并撤销全部托管 Key、核对失效，或只回退到保留这些校验的兼容版本；保留新账户、租约、订单及账本数据。
- 最终按总计划生成/更新 API `docs/aino-platform-deployment.md`、Aino `docs/desktop-account-auth.md`、`docs/aino-platform-user-guide.md`、进度与交付报告。真实发布准备完成前不能写“全部完成/可上线”。
