# Aino 平台一体化实施进度跟踪

**创建日期：** 2026-09-14
**执行者：** Claude Code（前期）与 Codex（复核及续作）
**总计划：** [implementation-plan.md](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)

## 最新接续状态（2026-09-16，优先于下方历史记录）

最新已复核本地代码检查点：Aino `5acc1c18b3a36d76afc31580abec3804ce56c880`，Aino-API `af10f7721299a8e2bf0a6433b6aeb44082c38bd7`，均在 `codex/aino-platform-identity-models-billing`。B6 精确后端能力检测已复核通过，模型 vision/reasoning 与错误恢复、精确平台 origin 仍待完成；D1 正使用固定构建执行第二次原生完整验证。尚非最终交付 SHA，未推送、未合并 main、未部署或真实付费测试。逐项条件见 [验收矩阵](aino-platform-acceptance-matrix.md)。

| 范围 | 当前事实 | 剩余工作 |
| --- | --- | --- |
| A、B1–B5 | 已有本地实现/分层集成证据保留 | 真实短信/付费模型、多平台验收不冒充通过 |
| B6 首次发送、作用域与账户草稿 | 首发/恢复、默认作用域、草稿和模型切换已复核；`911151ea09`/`ae59e82f52`/`5acc1c18b3` 精确连接能力及首次发送拒绝已复核通过 | 模型能力/错误恢复、精确开发 origin 和完整原生 UI 验收未完成 |
| C1–C3 | 账本查询、回合对账、幂等订单本地实现和复核完成 | 完整跨仓库 Agent → 账本 → 原生充值闭环仍归 D1 |
| C4 原生订单 | `789d9ddc5a`、`53a3597384`：安全 quote/create/get/list/cancel/openCheckout 和范围校验，复核通过 | 不代表真实渠道支付验收 |
| C4 充值界面与设备 | `0922f1ce50` 充值/订单恢复/历史，`a52a047f26` 设备管理；`e9e2f36a5d`/`f497ce9ff6` 恢复修复和 `7a215f2b11` 非 Aino 调用来源修复均独立复核通过 | 完整原生验收和真实服务验证待完成 |
| D API/站点质量 | `308aa7725` Go 契约/lint 修复；`19c43905f` Stripe 分块行为测试；unit 56 包通过、lint 0 issues，站点 286 文件/2,139 项通过；独立复核通过 | 最终生成物/构建及真实跨仓库门禁需对应最终树 |
| D Python 夹具 | 四目录回归 18,572 通过；三项断言失败已修复并通过 29 项定向回归与独立复核；TTFB 在原有时限通过 | 1 文件整套运行时 Bus error 未复现、未根治，不把整套标全绿 |
| D1 API 真实内部闭环与升级 | 真实内部闭环、pre-239 升级已复核；`af10f7721` 的当前→兼容旧版→当前二进制演练和精确撤销断言已复核通过 | 实际 Python Agent/原生 Electron 串联执行中；回退过程中签名回调履约、备份恢复未验收 |
| D 完整验收与部署准备 | 手机号最小灰度限制已复核；API 完整 unit/integration 通过，网站测试/types/lint/build 通过；操作单和逐项矩阵已建立 | 最终 UI 门禁、原生闭环、实际打包产物、多平台与正式服务验证尚未完成 |

本次接续新增进度：

- B6 后端能力检查点独立复核通过：只认可目标连接/profile 实际 `gateway.ready.managed_model_binding`，旧连接晚到事件不能授权新连接；未知能力默认拒绝，后续就绪能触发新用户默认选择且不覆盖明确 BYOK。8 文件/163 项覆盖测试通过；另有旧行为 4 项失败→恢复后 4 项通过的实证，类型检查/lint 通过。仍不是 B6 全部完成。
- API 回退演练检查点 `9efc0fb5c`/`13143789d`/`af10f7721` 已复核通过：实际 `6f73d6a58`→`78f962607b`→`6f73d6a58` 三个归档二进制对同一隔离 PG/Redis 运行，7.572 秒，三进程均就绪并 exit 0。身份/余额/订单/订阅/普通 Key 保持，托管 Key 在旧版撤销后保持 disabled、`parent_session_revoked`；短信 503/`SMS_DISABLED`、签发 403/`DESKTOP_MODEL_NOT_ALLOWED` 有精确断言。回执 SHA-256 `f04ce4ea3392695446e47ba9fc04a41c498bb397f90c9873bb1c2617f00723b4`。未验证回退期回调履约、备份恢复或生产回退。
- D1 第二次原生验证固定 Aino `5acc1c18b3` 与 API `af10f7721`，保留未提交测试夹具的精确 diff；renderer 和开发 main 构建 exit 0，main SHA-256 `03ad21c2ebf97df1cf40e364fcdf996b137f1a433b87379b78aac25982722b93`。使用临时账户/目录、外连及凭据读取拦截，验证正在执行，不能预先记通过。后续 B6 仅改 renderer 源码，不改该次构建和 Python。
- 该次原生验证随后在 12.9 秒停于启动隔离断言：Electron 未加载 `NODE_OPTIONS --require` 指定的 Node 外连拦截器；尚未登录，用户/模型/支付/用量均为 0，测试已清理，不盲目重试。正修改测试专用入口，在导入真实 main 前加载拦截器并先验证生效；不通过改生产逻辑或删除断言来放行。日志 `/tmp/aino-d1-native-run2.log`；本次不声称已建立完整隔离或完成原生验收。
- `8b53794e1f` 修复实际 phone-only 账户合法空昵称被桌面拒绝的问题；16 项测试和真实本地 API 客户端复验通过，独立复核通过。首轮完整 Electron 流程停在此处，未产生模型调用；修复后的完整原生复验尚未进行，不把 parser 通过写成登录闭环通过。
- `c83d5c1b71` 模型切换事务复核发现四项问题，正按原实现者定向修复：自定义 provider 别名、懒加载会话模型信息、导航后错误应用预设、响应丢失后的 native 清理。它们没有被忽略或标成通过。
- `7a215f2b11` 补齐每次实际非 Aino 模型调用的安全标记，含 fallback、显式辅助与晚到的回复更新；可与 Aino 账本费用并存，不断言本地/外部模型一定收费。76 项 Python、39 项 UI、所有 TS 配置及相关 lint 通过；独立复核已关闭两项问题，无新增问题。
- D3 仅开发服务端最小手机号灰度限制，不启用任何真实配置；原生夹具文件保留，未覆盖、未重复启动用户应用。
- API `6f73d6a58` 已本地提交最小手机号灰度限制；配置/短信策略/实际 PG/Redis HTTP 及相关合约、vet、构建、仓库 lint（0 issues）通过，独立复核进行中。旧原生夹具文件未混入。一次较宽 service unit 运行在 136 秒时手动终止，只记未完成；不能将无输出判断成死锁。
- Python 四个计划目录＋fallback 回归已完整执行一次：1,612 文件，18,572 项通过、3 项失败、209 项跳过，另 1 文件原生进程崩溃，315.1 秒，exit 1，未自动重试。失败是 Aino provider 注册/普通目录契约两项、维护计时断言一项；崩溃发生在 MCP 边界测试的依赖导入中。正做定向修正/有界诊断，不掩盖、不重复整套。原 TTFB 文件使用原有 300 秒预算，在 183.67 秒通过，无代码改动。日志 `/tmp/aino-d2-python-final-82e0ba3.log`。
- 后续 `5a7d7084c2` 将 Aino profile 正确标为会话托管，保留运行时注册而不进入手填 Key 的持久配置目录；`d0e248b758` 把维护测试改为验证精确闲置时间关系，不再依赖两秒时限。6 文件/29 项定向回归通过，独立复核通过，无遗留代码问题。MCP 文件只做了一次有界单独诊断，10 项通过；整套中的 Bus error 未复现、未据此臆测修复依赖。
- 最新 API `6f73d6a58` 的完整 unit 门禁已结束：56 包通过，53 包无测试，逐测试事件含 19,647 个通过、16 个跳过（含子测试），0 失败，exit 0。使用清理后的环境、正常 10 分钟包预算和 JSON 进度日志，未重复之前的人工 136 秒终止策略。日志 `/tmp/aino-d2-api-unit-6f73d6a58.jsonl`。
- Aino `d0e248b758` 最新完整 Electron 门禁通过：167 文件通过/2 原有跳过，2,261 项通过/6 原有跳过，exit 0，3.55 秒。日志 `/tmp/aino-d2-electron-final-d0e248.log`。后续 B6 能力任务仅修改 renderer；不能以此代替原生端到端登录、Agent 与充值验收。
- API `6f73d6a58` 完整 integration 门禁通过：50 包通过、59 包无测试，逐测试事件 12,164 个通过/16 个跳过（含子测试），0 失败，exit 0；实际隔离 PostgreSQL/Redis，无真实供应商调用。日志 `/tmp/aino-d2-api-integration-6f73d6a58.jsonl`。此运行包含未提交原生夹具中的普通协议/OIDC 测试增强，不包含需额外 `nativeconsumer`/`rollbackrehearsal` 标签的长流程；不能混称原生或二进制回退已通过。

本次最新门禁：

- 充值/设备 UI：5 文件、14 项通过；完整 Electron：167 文件通过、2 原有跳过，2,259 项通过、6 原有跳过。
- 最近一次完整 UI：863 文件通过、1 文件失败；7,884 项通过、3 项失败，日志 `/tmp/aino-platform-ui-full-current.log`。这 3 项已由 `fde0064f71` 补齐测试 API 夹具并在 136 项覆盖回归中通过，独立复核关闭；尚未在后续 B6 修改后的最终树重跑完整 UI。旧 summary/terminal/local-models 的失败未在本次完整运行复现。
- 充值恢复最新覆盖回归：3 文件/11 项通过，所有 TypeScript 配置及相关 lint 通过；永久丢失响应、无关历史不清除意图、匹配历史恢复原单、终态后显式新建均有行为断言。复核通过；不替代真实付款。
- 质量收尾报告：[Python 夹具](aino-platform-python-fixtures.md)、[API/站点/Python 独立复核](aino-platform-quality-review.md)。站点全量 2,139 项通过；Python 五文件 185 项通过，不把这两项等同整个系统全绿。
- `npm run typecheck`、`npm run build`、涉及充值文件 ESLint 和 diff 检查通过。保留 npm 配置、Vite 和全 UI jsdom canvas/window.open 的既有提示，不声称所有输出无噪音。
- 实际渲染（Playwright，真实组件＋隔离 bridge）：浅色 1280×800、深色 390×844。报价中 CNY/USD 分开；关闭重开仍 1 次 create；到账中不成功，COMPLETED＋账本读取后余额刷新；订单历史恢复、支付关闭提示、消费精确小数通过。稳定页面无横向溢出、框架错误或控制台 error/warn。临时 fixture HMR/格式化问题已修正后重新加载验收。
- 截图/夹具在 `/tmp/aino-c4-recharge-visual.Ty6LHm/`，非真实账户，不纳入 Git。原生真实平台支付、短信、模型收费、Windows/Linux 安全存储仍未验证。

## 2026-09-16 Codex 接手续作

用户已暂停 Claude，后续由 Codex 开发；2026-09-16 随后明确允许需要时调用子智能体。独立实现和复核可以并行，但不重复已经完成的任务，不盲目循环失败测试。保留下面的历史交接记录，但其中“交给 Claude”的安排已失效。

- B5 本地实现、相关验收完成，随本次阶段提交保存；Aino-API 仍为 `9de47dab17de239a3735963a7339c254e34878d7`，本轮没有 API 改动。
- 平台主回答/标题/压缩/视觉/子任务继承相同授权和费用来源；BYOK 独立，缺失自定义配置不能自动发现其他付费提供商。
- 每个实际 HTTP 请求携带独立 call ID，同回合共享 turn ID；压缩续接和工作区恢复保持计费会话 ID，显式分支分开。回复仅记录 `pending` 关联元数据，不冒充已结算费用。
- 过期、撤销、上游鉴权、余额/订阅不足分类；不重放整轮，不重建 prompt 来续租。短时平台授权不能被保存为无人值守定时任务的凭据。
- 最新相关回归 131 文件/1,388 项通过；B4/B5 定向 49 项通过；桌面通知 21 项、类型检查、相关 Ruff/ESLint、构建及 diff 检查通过。详见 [B5 验收记录](aino-platform-b5-review.md)。
- B6 模型 UI、C 钱包充值/真实消费对账、D 完整交付仍未完成。真实短信、模型收费、支付及 Windows/Linux 仍未验收。
- B6 当前已完成首个本地实现切片：内置/自定义模型分组、账户隔离目录、设置页内置模型入口、账户级新会话默认、首次创建绑定与提交前续租；仍待完整 Electron/端到端验收及错误恢复细化。
- 较大范围 Python 回归为 8,976 通过、4 失败、29 跳过，另 1 文件超时。本次计费关联失败已修复并复验；其他失败/超时单独列入 D，不以局部通过宣称整体全绿。
- 无推送、main 合并、生产部署、真实付费操作，也没有打开 Qoder 或其他 IDE。

### B6 首个实现切片（2026-09-16）

- Desktop 模型选择器新增 Aino 内置模型目录，保留原有 provider/model 自定义入口；不可用模型显示余额/额度原因，支持搜索、价格与能力详情。
- 设置 → 模型新增内置模型区，默认值按登录账户隔离保存；新用户且网关没有显式 BYOK 默认时，使用目录标记的可用平台默认。
- 会话创建、拆分会话和恢复提交沿现有 owner socket 完成平台绑定；平台模型不写入 BYOK 全局配置，账户切换会使旧目录结果失效。
- 修复目录请求在同一账户刷新快照后被误丢弃而长期 loading 的竞态；平台选择状态和 wire model ID 分离，避免 session.info 覆盖目录选择。
- 定向 UI 回归：11 个测试文件、193 项通过；类型检查和生产构建通过。完整 UI/Electron 门禁、真实模型 HTTP/扣费仍由后续 B6/D 验收完成。
- 追加门禁核对：Electron 平台测试 164 文件/2,247 项通过。完整 UI 最终为 852 文件通过、3 文件失败，7,842 项通过、2 项失败、2 项跳过；失败涉及 `summary-layout.test.ts` 超时、`terminal-layout.test.ts` setup 超时、`local-models-settings.test.tsx` quickstart 断言。尚无基线对照证明它们是旧问题，不能提前排除回归。日志 `/tmp/aino-b6-full-ui.log`。
- B6 仍需补默认选择按连接/profile 隔离、账户切换草稿、模型切换回滚、排队/流式绑定、能力限制、错误恢复和原生端到端验证；不能将首个 UI 切片标为全部完成。

### C1 钱包与报价（2026-09-16）

- API 本地提交 `0a0df8a00`，配对桌面代码 `4fd6a06002`；没有推送、部署或真实付款。
- `GET /desktop/billing-summary` 从当前用户读取 NUMERIC 原始十进制余额，冻结金额不重复扣除；订阅单独展示，不加入现金余额。
- `POST /payment/quote` 复用下单的金额计算，校验渠道、限额、账户、精度和币种。报价不建单、不调用支付提供商。新增接口只支持余额充值，保留原站点订单接口。
- 真实 PostgreSQL/Redis/JWT 集成覆盖钱包隔离、零余额有效订阅、报价与真实 EasyPay 适配器订单一致，以及修改费率/倍率后的关系；仅外部支付 HTTP 使用本地替身。
- 定向集成 `go test -tags=integration ./internal/repository -run 'DesktopWallet|QuoteMatches|DesktopCatalog|DesktopLease' -count=1 -timeout=120s` 通过（复验 7.915s）；13 项顶层场景、含子场景共 15 项，无跳过。相邻默认/unit payment/desktop 测试、服务构建、Wire 生成、新改动 lint 和 diff 检查通过。
- 完整默认 Go 命令 `go test ./... -count=1 -timeout=120s` 未通过：service 包达到 2 分钟总超时，最后执行到 `TestSystemOperationLockService_RenewLease`（该项当时刚开始，不能据此认定它死锁）。其余包结果在 `/tmp/aino-c1-go-default.log`；D 阶段使用合理整包预算复验，不盲目循环。
- C2 消费关联、C3 幂等订单、C4 桌面钱包和 D 仍待完成，C1 不代表充值已可在桌面使用。

### C2 消费关联基础链路（2026-09-16）

- 本地配对：API `66b0a0db6`、Aino `6a72a02a8d`。C2 尚未整体完成：消费查询的 main/preload 桥、有限对账重试和回复费用/明细 UI 待接入。
- 托管 Key 才接受 UUID/用途关联；关联存入请求私有 Key 副本，不污染共享鉴权缓存，整个 `X-Aino-*` 命名空间在上游转发前剥离。普通 Key 不接受桌面归因。
- 两条现有用量路径记录 session/turn/call/purpose；扣费事务成功才记录确定结算，失败/历史数据保持 unknown 和空的权威金额。精确金额读取 NUMERIC 文本并按原账本八位精度显示，旧 numeric actual_cost 不移除。
- 原 `/usage`、`/usage/stats` 支持关联过滤并强制当前用户；原 `(request_id, api_key_id)` 去重保持。迁移新增 `242_desktop_usage_correlation.sql` 和 `243_desktop_usage_indexes_notx.sql`；C3 必须检查占用并从 244 或之后编号开始，不能覆盖已应用迁移。
- 真实本地 PG/Redis/JWT → 托管 Key 鉴权 → Gateway RecordUsage → 扣费事务 → 用量读回已验证；同一请求两次写入仅扣一次，金额与余额差精确一致。此测试直接提供本地模型用量结果，不等同真实线上推理验收。
- Python 按实际 HTTP dispatch 记录调用，标题线程也归属原回合；晚到标题只更新原回复有上界的 display metadata。复用 `session.usage` 通知，无新增模型提示/工具或查询端点。桌面保留这些字段，处理通知先于/晚于 message.complete、旧版本通知和不同账户，未把“调用结束”当“已结算”。
- 定向 UI 31 文件/243 项通过；Python 网关＋标题/托管辅助/委托 128 文件/1,181 项通过；真实 API 集成 52 顶层场景/102 含子场景通过、0 跳过；Go 相关默认和 unit 测试通过，首次 SQL mock 列数/尾索引失败已修正夹具后复验，不放宽业务断言。
- 类型检查、桌面构建、相关 ESLint/Ruff、API 构建、新改动 Go lint（0 issues）通过；Ent 离线重新生成无漂移。完整 UI/Go 超时等历史待核验仍以先前记录为准，本阶段没有宣称全量 CI 已绿。
- 日志：`/tmp/aino-c2-{integration.jsonl,gateway-regression.log,final-ui.log,types.log,build.log}`。原生桌面 UI、正式短信/支付/收费模型未验证，无推送/合并/部署。

以上 C2 基础记录的后续：消费查询桥和回复费用/明细 UI 已实现，定向验收结果见下节；整体 C/D 阶段仍未交付完成。

### C2 桌面查询与回合费用（2026-09-16）

- 复用 `GET /api/v1/usage`，main 管理账户令牌和刷新；IPC 仅可信主窗口可调用，查询参数/返回字段白名单，renderer 不接收嵌套 Key/账户秘密。
- 查询必须匹配当前账户；退出或切换账户后，旧请求结果被拒绝。回合金额用八位定点整数精确合计，只有完整调用列表和实际确定结算记录全部匹配才显示最终费用；未知/缺失记录不当作免费。
- 回复保留原计时/token/上下文信息，新增费用小字与实际调用明细。六次以内自动核对、窗口隐藏暂停、手动重新核对、晚到辅助调用按新的回合版本核对；相同内容的新对象不会重置轮询预算。一次最多读取四页共 200 条，超过时明确标部分费用，后续完整历史入口归 C4。
- RED/GREEN 已复现并修复重复渲染额外查询、离线误提示登录、不可恢复错误无重试入口，以及不计费记录带非零金额的无效响应。费用明细入口先有失败测试再实现。
- 最新 UI 定向：38 文件/206 项通过；完整 Electron：165 文件通过、2 文件按原有条件跳过，2,252 项通过、6 项跳过；类型检查、涉及文件 ESLint（零错误/警告）、构建与 diff 检查通过。测试仍有原有 npm 配置/Vite 提示和 jsdom canvas 提示，未声称输出完全无噪音。
- Playwright 隔离页面复用真实 ReplyMetrics/ReplyCost/UsageView/ThemeProvider，1280×720 浅色和 390×844 深色均可读；展开明细、有限重试后的手动核对和部分→全部结算可用。最终页面无控制台错误、框架错误覆盖或水平溢出。初始临时夹具的 HMR 重复 createRoot 已修正；未把夹具问题改进生产。
- 证据：`/tmp/aino-c2-final-reply-regression.log`、`/tmp/aino-c2-cost-electron-full.log`、`/tmp/aino-c2-cost-types-final.log`、`/tmp/aino-c2-final-cost-build.log`、`/tmp/aino-c2-cost-lint-final.log`；截图与临时夹具在 `/tmp/aino-c2-visual.gv7psD/`，不纳入 Git。该 UI 验收使用隔离消费数据，不替代真实付费模型/支付和全栈最终验收。
- 后续独立复核已修正并通过：同一 call ID 对应不同账本行时保持金额不确定；分页必须满足服务器页码/页大小/总数与去重结果，短页不冒充读取完整；结算状态只接受字符串枚举。修复提交 `558a91beef`，测试夹具类型修正 `e4b5e85fc4`；定向 10 项通过，最新完整类型检查通过。

### C3 幂等订单与恢复（2026-09-16）

- API 本地提交 `d13d0fa33`，复核修复 `78f962607b`。迁移仅追加 `244`，保留旧站点未传 client_order_id 的兼容路径；桌面限定已配置的支付宝/微信余额充值。
- 同一用户/请求 UUID 在数据库持久去重；请求发往渠道前保存 submitted 状态，结果未知时仅查询原商户单号。报价只作比较，不决定账本；仅 owner 可获得有效 checkout，公开接口不泄露付款信息。
- 独立复核发现并用真实 PostgreSQL/签名回调复现一个并发问题：恢复查询写入交易号可能使正在入账的租约失效。修复后 9 项集成、3 项纯逻辑测试、相关 payment/fulfillment 回归和 go vet 通过，二次复核通过，未发现重复入账。
- 完整默认 Go 测试在初次实现上通过（service 139.843 秒）；最后窄修复运行覆盖路径，不重复整包。网站支付回归 17 文件/137 项、类型检查通过。Ent/Wire 初次生成完成，窄修复无 schema 变化。整体 unit/lint/历史测试问题仍归 D 验收，不宣称全量 CI 全绿。

### C4 桌面钱包只读切片（2026-09-16）

- 「我的账户」增加原账本的可用 USD 余额、冻结金额、独立订阅与到期时间。金额保持十进制字符串，不用浮点数合计或把订阅当现金。
- main/preload 增加账户校验的钱包、渠道信息和安全 scope 读取；令牌不进入 renderer。退出后迟到响应被拒绝；页面离开停止查询，可见恢复限频刷新，没有常驻轮询。
- 真实 UI 行为测试先红后绿；另用有限失败夹具复现“离线账户通知触发重复查询”，修复后只读取一次并提供手动刷新。相关 UI 2 文件/6 项、Electron 3 文件/50 项、类型检查及涉及文件 ESLint 零错误/警告通过。
- Playwright 使用真实钱包组件和隔离数据，浅色 1280×720、深色 390×844 验证金额/订阅/手动刷新，无水平溢出或框架错误；控制台 0 错误/警告。临时夹具 `/tmp/aino-c4-wallet-visual.riiwRW/` 不提交。未连接线上钱包。
- C4 的充值表单、订单恢复/历史、设备授权与完整联调仍待实现；B6 余项、D 仍未完成。没有推送、合并 main、部署或真实收费/付款。

## 历史记录：2026-09-15 续作核验

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

**状态：** C1 本地实现与定向验收完成；C2–C4 未完成，真实支付未验证。最新证据见文档顶部 C1 节。

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
