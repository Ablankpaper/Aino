# Aino 平台接入交付报告

状态：执行中，尚未达到完整交付或上线条件。最新核对日期 2026-09-16。本文记录可核对的证据；[逐项验收矩阵](aino-platform-acceptance-matrix.md)已建立，最终提交号、完整通过结果及制品哈希仍待剩余任务完成。

## 版本与范围

| 仓库 | 分支 | 本次恢复基线 | 最新已核对提交 |
| --- | --- | --- | --- |
| Aino | `codex/aino-platform-identity-models-billing` | `ba76603774` | `07b77b40b15f9e5e5d9f15f7fdf014c0a10f6eaf`；后端能力与首次引导修复已复核，模型能力/恢复/origin 与完整原生验收未完成 |
| Aino-API | `codex/aino-platform-identity-models-billing` | `f6b8849e0` | `997e0635b963af09a70b10dc7a59faa64a3711d3`；隔离闭环/短信灰度/有界回退及保留回调已复核，未提交原生夹具不计入此 SHA |

当前 A1–A6、B1–B5、C1–C3 与 C4 钱包/充值/订单/设备/费用来源切片已完成本地实现和相应复核；B6 模型切换及精确后端能力检测已复核，模型能力/恢复 UX 与 origin 隔离尚待完成。D1–D4 最终验收未完成。两仓库保留此前提交，没有推送、合并 main、部署生产或进行真实短信、付费模型和支付调用。

## 2026-09-16 最新验证切片

以下结果只覆盖各自记录的代码切片，不代表正在修改的最终树已经全绿：

| 范围 | 实际结果 | 证据/限制 |
| --- | --- | --- |
| B4/B5 真实 Agent 与辅助来源 | 三协议工具往返、续租/恢复/取消/切换已有隔离测试；B5 131 文件/1,388 项通过 | [B5 记录](aino-platform-b5-review.md)，非线上扣费 |
| B6 固定发送时模型及原 socket | `52ec689c98`、`fde0064f71`；首发/恢复及 profile rail 修复已通过独立复核 | 默认作用域、切换及原生完整流程仍待完成 |
| B6 作用域与账户草稿 | `6acd2046ca`：13 文件/454 项通过，独立复核通过 | 精确开发 origin、模型切换/能力和完整原生验证仍待完成 |
| B6 模型切换事务 | `c83d5c1b71` 原实现；`82e0ba3cc5`/`c3daa97bef` 关闭四项问题，独立复核通过 | 实际保留动画 DOM 的菜单重开测试、99 项覆盖和真实 Agent 反向切换通过；完整原生链路单列 |
| B6 精确后端能力 | `911151ea09`/`ae59e82f52`/`5acc1c18b3`：163 项覆盖通过，4 项旧行为 RED→GREEN、类型/lint 和独立复核通过 | 连接生命周期/首次发送拒绝，不代表 vision/reasoning、错误恢复或 origin 隔离已完成 |
| B6 首次引导 | `07b77b40b1`：平台可用模型不再被旧 BYOK 引导阻塞；36 项测试、类型/lint 和独立复核通过 | 实际第 4 次原生暴露的问题，待新构建原生复验；不持久化伪 BYOK 配置 |
| D3 兼容二进制回退 | 测试提交 `af10f7721`：归档 `6f73d6a58`→`78f962607b`→`6f73d6a58`，7.572 秒，三进程就绪/exit 0；独立复核通过 | 精确身份/账本/Key/撤销/关闭策略；不含回退期回调履约、备份恢复和真实部署 |
| D3 回退期保留回调 | `997e0635b`：同归档版本的一次 7.791 秒演练及独立复核通过 | 新充值关闭、旧订单合法签名到账一次、重复回调不重复加钱、恢复新版保留；备份/真实渠道/部署未验证 |
| D1 原生第二次固定构建 | Aino `5acc1c18b3` / API `af10f7721`＋未提交测试夹具；renderer 与开发 main 构建 exit 0；原生 12.9 秒在启动拦截器断言失败 | main SHA-256 `03ad21c2ebf97df1cf40e364fcdf996b137f1a433b87379b78aac25982722b93`；未登录，模型/支付/用量均 0；修测试入口后先验证隔离，不算业务通过 |
| C4 非 Aino 调用来源 | `7a215f2b11`：76 项 Python、39 项 UI、三个 TS 配置及相关 lint 通过，独立复核通过 | 可与 Aino 账本费用并存，不推断外部收费；非完整原生验收 |
| 原生空昵称修复 | `8b53794e1f`：16 项测试、真实本地 API 客户端复验、独立复核通过 | 只修合法 phone-only 空昵称解析；首轮 Electron 登录失败后的完整原生流程仍待复验 |
| C2/C3 | 真实隔离 PG/Redis/JWT/用量/账本和签名回调竞态已有分层证据 | [进度记录](aino-platform-progress.md)，仍需 D1 串联实际 Agent 与原生桌面 |
| C4 恢复修复 | `e9e2f36a5d`、`f497ce9ff6`；最新 3 文件/11 项通过，types/lint 通过，独立复核通过 | `/tmp/aino-c4-history-association-covering.log` |
| Electron 全量 | 最近一次 167 文件通过、2 原有跳过；2,259 项通过、6 原有跳过 | `/tmp/aino-platform-electron-full-current.log`，后续 renderer 改动后仍需最终门禁 |
| Electron 最新全量 | `d0e248b758`：167 文件通过/2 原有跳过，2,261 项通过/6 原有跳过，exit 0 | `/tmp/aino-d2-electron-final-d0e248.log`；当前后续能力改动仅 renderer，不把它当成原生完整闭环 |
| UI 全量 | 最近一次 7,884 通过/3 失败；三项 profile rail 已修复并在 136 项覆盖回归通过 | 尚未在最终 B6 树重跑，不将局部修复视为全量复验 |
| API unit/lint | `308aa7725`：56 包通过，golangci-lint 0 issues | [质量复核](aino-platform-quality-review.md)；不替代最新 tagged integration |
| API 最新 unit/lint | `6f73d6a58`：56 包通过、53 包无测试，0 失败、exit 0；本提交仓库 lint 0 issues | `/tmp/aino-d2-api-unit-6f73d6a58.jsonl`、`/tmp/d3-phone-rollout-lint-local.log`；逐测试事件计数包含子测试 |
| API 最新 integration | `6f73d6a58`＋普通 fixture 断言增强：50 包通过、59 包无测试，0 失败、exit 0 | `/tmp/aino-d2-api-integration-6f73d6a58.jsonl`；实际隔离 PG/Redis，不含 nativeconsumer/rollbackrehearsal 额外标签长流程 |
| API 默认测试/生成/构建 | `97e4a4812e`：默认测试 50 包通过/59 包无测试；生成与构建 exit 0，无 Ent/Wire 漂移 | `/tmp/aino-d2-api-{default-final,generate,generated-diff,build}.log`，未来灰度代码需新门禁 |
| API 实际内部闭环/升级 | `97e4a4812e`：32 顶层/38 含子项通过，独立复核通过；后续协议/OIDC 断言覆盖的两场景复验通过 | 实际 PG/Redis/auth/lease/gateway/ledger/callback；尚未与原生 Python Agent 连成一条链，旧二进制回退未验证 |
| 网站全量 | `19c43905f`：286 文件/2,139 项通过 | `/tmp/aino-d-site-final.log`；旧 Stripe 夹具失败已关闭 |
| Python 五文件夹具 | `2716c31ea9`：185 通过、3 原有跳过 | [夹具报告](aino-platform-python-fixtures.md)；TTFB 有界诊断已停止，未证明生产缺陷，也未取得整文件通过 |
| Python 计划范围最新回归 | `82e0ba3cc5`：1,612 文件/18,572 通过/3 失败/209 跳过，另 1 文件进程崩溃，exit 1 | `/tmp/aino-d2-python-final-82e0ba3.log`；TTFB 21 项在 183.67 秒通过；provider 契约、计时断言与导入崩溃正有界处理 |
| Python 失败定向修正 | `5a7d7084c2`、`d0e248b758`：6 文件/29 项通过，独立复核通过 | `/tmp/aino-d2-final-focused.log`；MCP 崩溃文件单独一次 10 项通过，整套 Bus error 未复现、未根治，不标全绿 |
| 充值实际渲染 | 明亮 1280×800 / 暗色 390×844，关闭恢复/完成后钱包刷新/历史/禁用状态通过 | 隔离 bridge，非真实支付或完整原生闭环 |

[用户指南](../aino-platform-user-guide.md)及 [API 部署与回退准备](../../../Aino-API/docs/aino-platform-deployment.md)已建立。部署文档是操作单，不是部署回执；尚未核验的短信模板变量、逐用户灰度、真实渠道、多平台安全存储及兼容回退不能填“通过”。

## 历史验收记录（以下保留原阶段证据）

## B3 修复交付（2026-09-15）

原 B3 的 mock 测试没有覆盖实际 token/HTTP/WS 链路。现已改为 main 私有鉴权请求、受保护会话 ticket/claim/bind 和现有连接解析；用户及 OAuth 身份变化、关闭、退出、过期、旧异步请求均有清理/拒绝行为。秘密只由 main 与目标网关接收，公开响应/模型目录为字段白名单，异常 WS 原文不进入日志。

网关全目录 122 文件、1,090 项通过；Electron 相关 19 文件、440 项通过；账户/绑定入口 UI 16 项及共享 RPC 19 项通过；全部桌面 typecheck、构建通过。最后 OAuth 主体/日志修正分别复验 38 项 TS、7 项 Python；相关 ESLint/Ruff 通过。具体命令与边界见 [B3 验收记录](aino-platform-b3-review.md)。

B3 仅证明本地可信绑定，不证明 Agent 能用该 Key 完成真实推理。没有运行整个仓库的所有 JS/Go/Python 套件，也没有真实收费、短信、支付、远程 TLS/SSH 或新原生确认界面人工验收。

## B2 修复交付（2026-09-15）

Ent 下载和缺失 go.sum 已解决，原锁定版本成功生成并提交实体/Wire。完成原子租约、短期凭据、真实撤销接线、父会话/权限校验、普通 Key 兼容、通用密钥秘密隔离和网站托管操作限制。9 项 B2 顶层真实 PG/Redis/HTTP 测试通过；包含目录/PhoneFlow 的 24 项组合通过。相关 Go unit、站点 16 项测试、类型检查、相关 ESLint、服务/站点构建通过，新增代码 lint 0 问题；生成物二次生成一致。

默认 Go 全仓第一次被新增 Google 鉴权 import 遗漏阻断；修复后全部 9 个受影响包完整默认测试通过，其余包在此前全仓运行通过。全量 lint 的 7 项旧问题、原 unit/站点/Python 待修清单仍保留。不能将此写成全量 CI 已绿。

浏览器使用隔离 HTTP 数据验证 `/keys` 托管行只保留删除、普通行保留原操作，以及正确删除确认；最终页面无控制台错误。截图与日志位于 `/tmp/aino-b2-validation.Bc4bcf/`，不含真实凭据；非短信/模型/支付线上验收。准确命令、限制及后续接口见接续清单。

迁移新增 240 和 241，已用于隔离测试，后续不可重写。回退到不识别托管 Key 的旧服务前必须停止签发并撤销托管 Key，或使用保留租约鉴权的兼容版本。具体发布操作单仍由 D 阶段完成。

完整逐项状态以 [进度记录](aino-platform-progress.md) 为准，要求与矩阵以 [总计划](../aino-platform/implementation-plan.md) 和 [验收计划](../aino-platform/04-delivery.md) 为准。

## 已有自动验证

以下均为恢复前取得的真实记录，并非 B/C 改动后的最终回归。

| 命令/范围 | 代码范围 | 结果 | 限制 |
| --- | --- | --- | --- |
| 桌面 `npm run test:ui` | A6 `ba76603774` | 7,835 项通过 | 模型和钱包尚未接入 |
| 桌面 `npm run test:desktop:platforms` | A6 `ba76603774` | 2,237 项通过，6 项原有跳过 | 跳过不计为通过 |
| 桌面 typecheck、相关文件 lint、build | A6 | 通过 | 开发构建，不等于正式安装包 |
| `e2e/platform-account.spec.ts` | A6 | 1 项原生登录流程通过 | 实际 Electron/main/preload，平台 HTTP 为本地替身 |
| API `go test -count=1 ./...` | `f6b8849e0` | 通过 | 不替代带标签的测试 |
| API `CI=true go test -tags=integration -count=1 -timeout=10m ./...` | `f6b8849e0` | 通过 | 实际隔离 PostgreSQL 18.1 / Redis 8.4；外部供应商不在此范围 |
| API `go test -tags=unit -count=1 ./...` | `f6b8849e0` | 55 个包通过；server 3 条契约失败 | 夹具及新增字段预期待修 |
| 站点完整 Vitest | A4 | 2,133 项通过，2 项已定位旧失败 | 失败未隐藏；后续仍需回归 |
| 站点 typecheck、lint、build | A4 | 通过 | 构建和测试已有警告单独记录 |
| Python gateway | `6045655178`，Python 未改动 | 1,085 项通过 | 内置模型接入前基线 |
| Python agent/plugins | 同上 | 8,278 项通过，2 失败，28 跳过，1 项重试后通过 | Hindsight 夹具隔离及 FD 定时器竞态待修 |
| Python CLI | 同上 | 9,123 项通过，1 失败，181 跳过 | SQLite 发现夹具遗漏旧拒绝状态，待修 |

## 真实环境验证

| 项目 | 环境 | 已验证 | 尚未验证 |
| --- | --- | --- | --- |
| 账户安全存储 | macOS，独立测试 userData，本地模拟平台 | 实际 OS 加密、私有文件权限、重启恢复、退出清除 | Windows/Linux、拒绝/锁定 Keychain、正式安装包 |
| 手机登录 | 隔离 API/DB/Redis | 真实内部身份、认证、绑定、TOTP 与验证码消费链路 | 阿里云真实受理、送达、三网覆盖和正式人机验证 |
| 平台模型 | B4/B5/C2 隔离环境 | 真实 Agent/本地模型协议工具往返；API 用量/账本另有分层证据 | 原生端到端串联、正式模型真实扣费与能力覆盖 |
| 钱包充值 | C1–C4 隔离环境 | 原服务订单/签名回调一次入账，原生桥边界与 renderer 恢复分层通过 | 跨仓库原生完整闭环、真实支付宝/微信小额支付 |

## 待完成门禁

1. 完成 B6 能力/恢复提示、精确平台 origin 及原生验收；已过复核的模型切换、默认值作用域、账户草稿和 A/B1–B5 不重做。
2. 在最终 D1/D2 复核费用来源与账本显示；C4 非 Aino 调用来源已过独立复核，C1–C4 稳定切片不重复重写。
3. 完成最终必要门禁。TTFB 在未改代码的 300 秒默认门禁内 21 项通过；三项 Python 断言失败已修复并通过定向回归和复核。整套运行时 1 文件 Bus error 仍未根治，不反复空跑、不标全绿。
4. 完成 D1 原生 Electron＋真实 API＋Python Agent 闭环；API 内部闭环、旧 schema 升级与有界兼容二进制回退（含隔离签名回调）已复核。备份恢复、真实渠道与生产回退仍未验证。
5. 整理配对提交、制品、配置、部署与回退说明；新增 SQL 保持 forward-only。
6. 缺少外部材料或授权的项目列为人工验收项，完成其余本地开发；不盲目重复受阻命令。

## 发布判断

当前不能宣称“登录即可聊天和充值”已完整可用，也不能宣称全量 CI 已绿。正式上线前必须补齐模型分组/能力/价格配置、短信模板和供应商验证、支付渠道与协议配置，并在明确范围内取得真实联调证据。

回退必须保留新账户、订单和账本数据；停用新充值入口不能停止已支付订单的回调履约。API 操作单记录本地兼容演练 SHA 与二进制哈希；后续带保留回调的回执 SHA-256 为 `2c2fa0454e7cfdb12d910df4784a32adf2a6f5f2ddd4ad4abdd2cd4c2e4bdcc8`。它证明合成渠道的签名回调仍履约一次，但未覆盖备份恢复或实际生产环境，不能外推为完整上线回退验收。
