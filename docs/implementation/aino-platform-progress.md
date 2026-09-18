# Aino 平台一体化实施进度跟踪

## 当前同步与配对验收（E42，2026-09-18）

[E42 当前同步与配对回执](aino-platform-integration-20260918.json)：合并 `7f63770421` 将 main v0.21.3 修复整合到业务分支；业务构建 `4a2fcaf2ad`、原生夹具 `b9249bf5a5` 配对 API `d15c202c6`（生产基线 `f2feefbfc3`，其后两提交仅改隔离夹具）。`b94af3dd65` 修复永久 BYOK 切换及 `--once` 还原后的压缩快照，真实 loopback/SQLite/压缩恢复不变式通过，独立复核关闭 P2。

本轮 7 文件 Python 728 项、完整 UI 8,274 项、Electron 2,356 项（6 项原有跳过）、安装 helper/driver 35 项及 3 套 TS 检查通过，各自保留运行源码。核心业务、压缩恢复与账本、迟到租约、同站点账户隔离、跨站点归属隔离五条原生场景最终通过；首次同站点/core 的 5 秒冷初始化超时保留，夹具修正后显式复验，无自动重试。

原生压缩账本缺口由 E42 关闭；fresh SMS 重启仍不算记住登录。I1：packaged install driver 缺隔离登录前置条件，保留为本轮范围外发行门禁，不绕过登录或削弱 Settings/backend 检查。外部供应商均为 loopback 替身；签名/公证、其它 OS/远程与真实服务仍未完成。E38–E41 以下保留历史来源，不改写旧回执。

## 前轮压缩与启动检查点（E38–E41，2026-09-18，历史）

接续修复：[E41](aino-platform-compression-status-20260918.json)，`ec33331aa6` 已关闭 `would_grow` 状态与桌面成功提示不一致的问题；保护拒绝压缩时返回 `aborted`，保留历史，不再写入成功消息。后端 667 项及桌面发送操作 150 项定向回归通过（实现报告保留，未保存原始日志），主控类型检查/scoped lint 及独立复核通过。原生压缩后的账本结算仍在推进，不计入 E41。

A/B/C 本地实现与既有验收保留，本轮补齐压缩恢复缺陷、合并上游后的关键原生复验和启动测试收尾；D 完整发行门禁仍未完成。配对业务源码为 Aino `c0620226c03d30cbbe0a47845f935efe1b9dae2e` / Aino-API `f2feefbfc3f58f035bb1ef053c5a1826e33dd602`，后者已合并上游 v0.2.5，不再是早期 `acc7fc760`。Aino 启动测试检查点为 `0b30ad930c19a5731f33ad62a6ef813be9112e73`；其与业务构建之间只有测试/安装验收改动。

- [E38 压缩恢复](aino-platform-compression-20260918.json)：修复压缩子会话的托管身份继承与 Responses 旧消息投影。实际 gateway/Agent/SDK 经三协议及默认/命名工作区的压缩、关闭、恢复、重新绑定和分支发送，6 项通过、29.3 秒。未包含原生压缩后的 API 账本结算。
- [E39 配对构建及原生业务](aino-platform-native-20260918.json)：桌面构建及 Electron 类型检查通过，421 个 dist 文件；API 网站构建通过，182 个文件。迟到租约隔离 61.243 秒、核心业务 220.696 秒通过，覆盖登录、工具、停止结算、充值、重启后重新登录/历史绑定、工作区、双窗口、隐藏恢复、BYOK 与网站余额。7 条平台用量合计 0.0007 USD，最终余额 12.79930000 USD，BYOK 不增加平台消费；网站按两位小数显示 12.80。
- [E40 启动验收](aino-platform-launch-20260918.json)：修复安装更新驱动的 `expectSha` 作用域及测试登录前置条件。两次登录门禁失败均保留；完成隔离开发登录后，真实主 renderer → 设置 → 只读后台状态验收通过，外层 15.204 秒，无重试。最新修正的 13 项定向测试、E2E 类型检查和独立复核通过。随后已恢复 production main/preload，完整性检查通过；这不是全新安装器或正式签名包验收。

原生业务使用真实 Electron/Python/API/隔离 PostgreSQL/Redis，短信、模型和支付出口为 loopback 替身。测试期间源码与两端 dist 不变；重启是重新登录，不算记住登录验证。生产 renderer 的构建戳仍真实保留 `c0620226c0`，未为测试/文档提交伪造新戳。历史广泛回归仍只对应各自源码，本轮没有重复全量测试或声称最终树全绿。

剩余项：原生压缩账本结算、Windows/Linux 安全存储及清理、拒绝/锁定 Keychain、SSH/TLS、长时与其余原生能力矩阵、真实短信/captcha、真实模型扣费和支付/退款、签名/公证及上线。`would_grow` 状态反馈由 E41 单独关闭，不改写 E38 的历史覆盖范围。E37 已证明其历史未签名 macOS 包默认 sandbox 可运行，不能替代本配对版本的正式发行验收。本轮仅本地提交，没有推送、合并 main、部署或真实付费操作。

## 前轮共享后台、迟到租约与 macOS 候选包（2026-09-17，历史）

本轮授权的第 1、2 项已完成本地验收。共享 Python 后台发现并修复了三条归属缺口：跨主体读取用量、被拒绝的发送提前接管 transport，以及会话激活／恢复绕过发送检查。`0a5b610ddf` 共用托管会话归属判断，保留同主体重连与新授权；同站点不同用户、不同站点同数字 ID 的两条合同均通过，真实 gateway 一次性票据、Agent/SDK、工具、并发请求和一方清除／断连后的另一方继续均已执行。见 [E35 共享后台与回归回执](aino-platform-shared-backend-20260917.json)。这不是通用多租户历史 ACL 审计，失去凭据的旧历史仍按原设计可读。

[E36 迟到租约原生回执](aino-platform-late-lease-20260917.json)在 28.511 秒通过：退出 A 并登录 B 后才释放 A 的真实凭据 HTTP 响应，原 bind 明确返回 `auth_attempt_superseded`，无推理／扣费；显式新建 B 会话后才恢复。费用收敛合同 3 文件／16 项通过，原生最终显示 `Charged 0.0002 USD`，等待显示期间账本／调用计数不变。未复现费用组件生产缺陷。

[E37 macOS 候选包回执](aino-platform-packaged-sandbox-20260917.json)在 81.558 秒通过：生产模式 `.app`、默认 Chromium sandbox、登录→工具聊天→费用→正常关闭→fresh SMS 登录→历史续聊。两次 renderer 的实际 `sandboxed=true`，没有 `--no-sandbox` 或外层 `sandbox-exec`；已观测的应用／renderer／backend 均正常退出，无强杀。构建 Aino `a2ff532db2`／API 夹具 `93082b333`，开发与生产 dist 各 395 文件，候选包 656 文件在原生运行前后哈希不变。后续 `b0cd4e82e9` 仅修正测试空行，未重记构建来源。

候选包位于 `/private/tmp/aino-next-package-MQJqsm/artifact/mac-arm64/Aino.app`，归档 `Aino-0.21.1-mac-arm64-local-candidate.zip`，SHA-256 `2f32e2f9067743e67cb2c4b25ce78c2803b42a0dc1c5c52818d434dafc52293a`。它尚不具备正式分发条件：当前是 Electron linker ad-hoc 签名，`codesign --verify --deep --strict` 与 Gatekeeper 均 exit 1；本机未找到 Developer ID Application 身份，未发现环境中的公证配置，未读取 Keychain 公证档案。只做了准备检查，没有执行正式签名、公证提交、安装或部署。

本轮后台较广回归为 126 文件／1,128 通过／1 失败（70.9 秒）。唯一失败是旧断言把随机 UUID 中的 `1234` 当作验证码泄漏；`4a1ab840cc` 改查挑战已移除及完整验证码值后，该文件 10 项通过。保留原失败回执，不合并声称整套全绿。三套 TypeScript 与最终 scoped lint 通过；API 夹具 4 项真实 PG/Redis 合同及 pinned lint 通过。此前全量 Python 18,708、UI 7,985 等结果继续只对应原检查点。

原生流量在传输边界映射至隔离真实 API／PostgreSQL／Redis，供应商为 loopback 替身；生产 origin 与授权／业务逻辑保留。结果不代表生产 TLS、真实短信／收费模型／支付、Keychain 记住登录、首次下载运行时或正式签名发行通过。远程／其他 OS、长时任务、完整矩阵和真实供应商仍是后续范围。没有推送、合并或上线。

## 前轮剩余模型边界与最终本地回归（历史）

用户本轮授权的第 1、2 项已完成。三条新增原生验收分别通过：[余额不足／429／服务异常恢复](aino-platform-model-failures-20260917.json) 36.949 秒、[同站点双账户隔离](aino-platform-account-isolation-20260917.json) 84.067 秒、[跨站点同数字 ID 隔离](aino-platform-origin-isolation-20260917.json) 88.198 秒（均为完整外层命令）。429 实测三次请求，间隔 2076／2068 ms；上游 503 真实转换为客户端 502。失败请求无结算，账户恢复不自动重放；主动 Retry／发送才发生工具回合。并发账本按用户、Key、会话与回合核对；跨站点仅释放一边时另一边仍等待且未扣费，旧归属历史只读，新会话恢复只向当前归属计费。

修复了原生发现的恢复按钮被输入框拖拽层遮挡：`420836fafd` 调整提示层级，普通点击在两条隔离验收中成功。最终冻结源码 Aino `420836fafd`／API 夹具 `4dcbb1b34`；Python 计划范围 1,624 文件／18,708 通过／0 失败／217 跳过，未观察到 SIGBUS；完整 UI 875 文件／7,985 项通过；Electron 2,262 通过／6 跳过；三个 TS 配置、官方 lint 及 E2E lint 均 exit 0（官方 lint 0 错误、187 条当前警告）。[最终回归回执](aino-platform-final-regression-20260917.json)保存命令、计数、哈希、失败原因与独立复核。错误恢复原生使用先前同轮构建 `51ef28264a`，两条隔离使用 `420836fafd`；两个 395 文件开发构建均保存独立清单，不混记源码。

这些结果覆盖已授权的本地范围；供应商为 loopback 替身。晚到租约绑定响应、共享后台多主体、远程／其他 OS、长时任务、正常签名发行和真实供应商仍分别待验收。没有推送、部署或新安装包；历史 Python 18,593／1／209 与 UI 7,982／1 仍保留原失败记录。账本终态已验证，最终截图的费用标签刷新收敛不属于本轮断言。

**创建日期：** 2026-09-14
**执行者：** Claude Code（前期）与 Codex（复核及续作）
**总计划：** [implementation-plan.md](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)

## 前轮第 1、2 项完成记录（历史，原证据归属保留）

第 1 项已完成本地诊断与修复：`9cb574c2dd` 修复首次建库与零库隔离的竞态。实际 SQLite VFS 捕获了活库被换 inode、同一 SHM 的 32 KiB 活跃映射被缩到 3 字节；修复后定向观测为 0 次错误隔离、0 次 SHM 缩短。未自然复现历史 SIGBUS，无法追溯原 fault inode。新较广 Python 回归为 18,593 通过、1 失败、209 跳过，无 SIGBUS；唯一 LSP 测试清理失败由测试 guard 修复 `0eca169be6` 后以 41 项定向验证关闭，原整套结果仍记录 exit 1。见[SQLite 修复报告](aino-platform-sqlite-recovery-20260917.md)。

第 2 项两条隔离原生切片已分别通过：[并发刷新／退出](aino-platform-account-concurrency-20260917.json) 27.0 秒，验证双窗口刷新与退出单飞、退出响应前清除原会话授权、晚到刷新被拒绝、旧租约 401 且无额外消费；[断网／撤销恢复](aino-platform-account-recovery-20260917.json) 76.278 秒（外层命令），验证同一身份保留、账户 Retry 与钱包显式 Refresh 恢复、真实会话撤销拒绝原推理且无消费、重新登录不自动重放，下一次主动发送才新增两条用量。外部供应商均为 loopback 替身，真实业务运行在 Electron、Python Agent、API、隔离 PostgreSQL/Redis；双窗口提示、秘密与网络审计均通过。

本轮还修复了实际验收发现的两个界面问题：`28f5f37f48` 让菜单订阅真实连接身份，`d0d6ebe038` 防止离线及恢复加载期间引导遮挡账户操作。后者 13 项定向测试、类型/lint 与独立复核通过。完整 UI 在前者上为 7,982 通过、1 失败；测试专用 `246cffe9b2` 修正同毫秒消息排序假设后，115 项定向验证通过。没有将两套广泛运行改写为全绿。准确源码、失败及后续关闭证据见[本轮验证回执](aino-platform-account-edges-validation-20260917.json)。

配对来源：并发场景业务构建 `246cffe9b2`，恢复场景业务构建 `d0d6ebe038`／E2E `62d3507b24`，API 夹具 `6ce52d674`（生产 API 仍为 `acc7fc760`）。两个构建各 395 个 dist 文件，步骤均 exit 0，哈希分别保存；本轮未产生安装包，未推送、部署或调用真实收费服务。正常签名发行、多平台／远程、其余长时矩阵和真实供应商仍是后续独立门禁。

## 前次接续状态（历史，原证据归属保留）

本次接续已完成两条独立隔离验收：工作区工具/默认工作区返回/双窗口/隐藏恢复于 `8e8699e4b1` 构建通过（1 项、22.5 秒），[回执](aino-platform-workspace-acceptance-20260917.json)记录同账户、独立后台、两条用量及余额 `10.00000000 → 9.99980000`，扣费 `0.0002 USD` 与账本一致，网络和落盘审计通过。另一次桌面充值后网站独立登录通过（1 项、1.3 分钟），[回执](aino-platform-cross-client-recharge-20260917.json)记录一笔订单、一次支付调用、重复签名回调只入账一次、余额 `10.00 → 12.80 USD`，两端账户与余额一致，模型调用和用量均为零。供应商仍为本地替身，没有真实短信、模型消费或支付。

菜单连接身份、profile-only 绑定目标和首次授权请求分别由 `3300447627`、`b9e513e7e7`、`8e8699e4b1` 修复。完整 UI 在 `8e8699e4b1` 上通过 874 文件/7,979 项，exit 0；Vitest 计时 354.69 秒，外层完整命令计时 355.49 秒，证据 `/private/tmp/aino-ui-final-continuation-hMD5xI/ui.log` 和 `ui-exit.json`。后续清理修复 `3517ccfd3b` 保证中途导航/分屏创建失败时回到原后台执行 close/release；2 项行为 RED 后，3 文件/124 项通过（4.58 秒，含真实 profile-rail 集成），三个 TS 配置和 scoped lint（0 errors/0 warnings）通过，独立 `delivery_audit` APPROVED 关闭唯一 P2。该提交使用上述定向证据，完整 UI 与工作区原生回执仍明确对应 `8e8699e4b1`。Python SIGBUS、矩阵其余未覆盖条件及正式发行门禁仍开放。

两条原生切片的源码分开记录：工作区实际构建为 `8e8699e4b1`，跨端充值实际业务构建为 `0eace11bfc`，其回执中的 `3300447627` 是运行时 checkout HEAD；两者均使用 API 测试夹具 `a5f720aa8`（API 业务 `acc7fc760`）。跨端充值不作为后续 renderer 修复的运行证据。完整 UI 与清理修复结果汇总见[接续验证回执](aino-platform-continuation-validation-20260917.json)。

前次开发构建对应业务 `3517ccfd3b` / API `a5f720aa8`，E2E 夹具已提交为 `855edc2e1d`。renderer Vite（外层 11.142 秒）、显式 Electron tsc、main/preload `--dev` 打包、native deps staging 和 dist 完整性检查均 exit 0；395 个 dist 文件的清单与日志哈希见接续验证回执。这是开发构建，没有生成新安装包或重跑原生验收。

### 接续前检查点（历史）

历史业务代码检查点：Aino `0eace11bfc`（工作区引导修复），Aino-API 业务 `acc7fc760` / 测试夹具 `a5f720aa8`。此前核心原生验收对应 Aino 夹具 `32c0ca8eae` / API `ff00058c3`：无 BYOK 登录→真实 Agent 工具→停止后的尾部结算→充值→重启重新认证/历史重绑定→BYOK，2.4 分钟、exit 0。平台累计 5 条 usage、消费 `0.0005000000` USD，充值后余额 `12.79950000` USD；BYOK 发送前后平台余额/模型调用/usage 均不变。三次启动网络/renderer 秘密审计与最后落盘审计通过；字体请求在 transport 前被拒绝。该用例不包含后续工作区和跨端充值切片。当时 `0eace11bfc` 的完整 UI 运行 300 秒超时，历史 UI 7,973 项和 Electron 2,262 项只对应各自原检查点；当前 UI 及扩展验收以上方最新状态为准。未推送、合并 main、部署或真实付费测试。见[核心原生回执](aino-platform-native-acceptance-20260917.json)及[验收矩阵](aino-platform-acceptance-matrix.md)。

### 当前范围与剩余工作

| 范围 | 当前事实 | 剩余工作 |
| --- | --- | --- |
| A、B1–B5 | 已有本地实现/分层集成证据保留 | 真实短信/付费模型、多平台验收不冒充通过 |
| B6 首次发送、作用域与账户草稿 | 历史首发、工具、工作区、双窗口和隐藏恢复保留；本轮 E28 并发刷新／退出与 E29 断网／撤销恢复原生通过；菜单及离线引导缺陷修复 | E31–E33 新增错误恢复／账户与站点隔离通过；E35/E36 已覆盖共享后台托管授权与迟到凭据；远程及完整能力矩阵仍未覆盖 |
| C1–C3 | 账本查询、回合对账、幂等订单本地实现/复核完成；Agent → API 账本 → 原生充值与充值后网站独立登录核对均通过 | 真实供应商扣费、正式逐模型账单与真实支付仍待验收 |
| C4 原生订单 | `789d9ddc5a`、`53a3597384`：安全 quote/create/get/list/cancel/openCheckout 和范围校验，复核通过 | 不代表真实渠道支付验收 |
| C4 充值界面与设备 | `0922f1ce50` 充值/订单恢复/历史，`a52a047f26` 设备管理；恢复/费用来源修复已复核；隔离原生充值与双端到账一致通过 | 其余原生异常、真实设备与真实渠道验证待完成 |
| D API/站点质量 | 既有 Go/站点全量门禁保留原版本归属；E39 在上游合并后的 `f2feefbfc3` 上网站构建/类型及 3 项 locale 测试通过，配对原生业务通过 | 不把历史全量结果移记到当前合并树；完整发行/真实服务仍待验收 |
| D Python 夹具 | E34 冻结420836fafd，1624文件18708通过／0失败／217跳过，官方runner无重试，无SIGBUS | 计划四目录及相关SQLite／guard回归通过；其他OS跳过项与全仓库其余测试不外推，E26失败保留历史 |
| D1 API 真实内部闭环与升级 | 历史内部闭环、升级、兼容回退与备份恢复保留；核心、工作区、跨端充值和本轮两条账户原生切片通过 | 生产备份截止点、其余异常／远程与长时场景未验收 |
| D 完整验收与部署准备 | E42 同步、运行时修复、五条配对原生场景和当前分层回归已记录；E26–E41 保持历史归属 | I1 隔离安装登录夹具、签名发行、其余原生／多平台／远程与真实服务未完成 |

历史修复与本轮诊断证据（原运行结果保留，当前状态以上方为准）：

- 网站独立真实手机号登录/余额 UI 在 `/private/tmp/aino-website-refreshed-TwPE3S/` 通过：1 项、37.6 秒、exit 0，实际 Vue 页面余额 10.00 与隔离账本一致，浏览器上下文 HTTP/WS 外连拒绝计数均 0。API 测试夹具补齐真实鉴权 `auth/me`，提交 `a5f720aa8`；不是修改生产余额。见[网站独立回执](aino-platform-website-acceptance-20260917.json)。
- 工作区引导错误已提交 `0eace11bfc`：以 `$activeGatewayRoute` 和实际 gateway connection 查询能力，不再使用界面 `local` 别名误查 profile-only socket；未知能力仍拒绝、手动引导保留、不写伪 BYOK 设置。RED 1 失败/2 通过，修复后 8 项聚焦测试、类型/lint 与独立复核通过。新构建 `/private/tmp/aino-native-onboarding-fixed-9OPrtN/` 已确认切入新工作区后聊天首页可用、同账户同余额；随后 ENOENT 停在测试自己的 guard 标记路径检查（启动时写 root HOME，不是 CLI 后来切到的 profile HOME），未发出该工作区模型请求。该次扩展原生整体 exit 1，后半段不记通过。
- 历史完整 UI 超时：`/private/tmp/aino-workspace-onboarding-fixed-iMxxR2/ui.log` 一次 300 秒超时、exit 143 / `ETIMEDOUT`，没有完整最终计数。四个超时/失败文件仅定向单 worker 复查一次，20 项通过、14.06 秒；三个 TS 配置、renderer 构建（12.86 秒）和开发 main 打包通过。没有证据将失败归因于引导修复或仅环境因素，不把局部绿灯写成全量通过，不重复空跑。
- **D2 首轮定向诊断（历史）：** 已将 Python fault 定位到 SQLite WAL 调用栈内的文件映射 page-in past EOF；单次带时序实验没有复现 SIGBUS，并排除了逐 fixture 删除临时目录的解释。该阶段实际映射文件与操作/actor 未知；后续真实 VFS 已确认错误换库及活跃 SHM 缩短，见 E26。首轮不预设发生了 truncate，不修改 WAL/生产启动或跳过测试来冒充根治。打包 A/B 仅证明外层 `sandbox-exec` 下的交互差异，没有证明普通安装的源码缺陷；正常默认沙箱、最新签名/公证包仍待验证。详见[本地发行门禁记录](aino-platform-local-release-gates.md)。
- **历史核心原生完整用例通过：** `/private/tmp/aino-native-final-verified-Os7n6L/`；API 证据 `aino-native-api-9efh0G`；run ID `9a5ab036-5dcb-47fb-a470-f27965c7e3e9`。测试时 HEAD 为 `3e62f7803d`＋已记录 test-only diff，该精确代码随后提交为 `32c0ca8eae`。367 个 dist 文件逐一匹配 `aae34d629b` 的固定构建，未重构生产代码；tsc/lint exit 0，原生 1/1、2.4 分钟、exit 0，API exit 0，测试容器清理完成。两次工具往返共四次调用，加停止回合一次调用，共 5 usage/3 turn；一笔充值仅加款一次；第三次启动 BYOK 成功回复且平台余额/用量不增加。重启使用新随机短信重新认证，不冒充记住登录自动恢复。
- **夹具审计修正：** 保留 `onBeforeRequest` 早期拒绝，启动前被动观测字体请求，按主进程核对候选/无鉴权头无请求体 GET 样式表；host-only marker，不保存字体 URL query。类型/lint 及 3/3 guard/小数合同通过；独立窄审阅发现的过晚拦截/监听器覆盖已修正，随后补齐可缺省 type 和观察器失效处理，由 root 复核。前次原生在 BYOK 选择器超时，截图确认可见名为 `Mock Model` 而非内部 ID `mock-model`，仅修测试定位后复验成功。历史失败保留于 `/private/tmp/aino-native-final-20260917/`。详见[审计说明](native-font-denial-report.md)。

以下为此前各次运行的历史记录；其中“待修/尚未执行”仅描述当时状态，当前待办以上表与验收矩阵为准：

- Aino `dc3f0812d1` / API `ff00058c3` 使用未变更的 `aae34d629b` 业务构建：首次工具两次模型调用、停止回合一次调用，共三条 settled usage，消费 `0.0003000000` 与余额 `9.99970000` 精确相符。停止时真实下游断连、上游有限尾部 drain、无超时或清理冒充成功；充值报价 20.5 CNY/到账 2.8 USD，只有一个订单和一次支付创建，重复签名回调后 COMPLETED、余额 `12.79970000`，桌面读取与 API 相等。证据 `/private/tmp/aino-native-money-fixed-HiLLwQ/`，本地供应商替身，不代表真实付款。
- 该次流程在充值后网络审计停止，原因仅为既有主题发起的 `fonts.googleapis.com` 样式表请求已被拦截。一次诊断 `/private/tmp/aino-native-transport-probe-VQ5q93/` 确认这一事实；不开放外网，改为明确记录指定公共样式表的预期拒绝，其他请求仍失败。重启与历史/BYOK 尚待该审计修正后验证。先前停止/小数解析/OTP 等测试夹具问题均已定向修复，以下保留历史证据，不表示这些问题仍开放。
- 最新 Aino `71a49eac2c` / API `0d46e5e54` 在同一业务构建上复验：输入框 Stop 实际点击后，Python 记录 TCP 强制关闭、API 调用中断及回合 `interrupted`（0.3 秒）；测试仅在 `stream_cancelled === 1` 失败，清理正常、API exit 0。只读诊断确认服务端 raw Chat Completions 使用 `context.WithoutCancel` 并继续 drain 最终 usage，这是既有计费合同，不是停止未生效。正在改测试为真实下游断连、受控终态用量和一次结算，保留 cleanup 与业务计数区分；不修改生产取消/计费语义。证据 `/private/tmp/aino-native-stop-fixed-yaIR2P/`，API `aino-native-api-PizYQk`。
- 完整 UI 在业务提交 `aae34d629b` 上复验：874 文件、7,973 项通过，107.91 秒、exit 0；日志 `/tmp/aino-ui-final-aae34d629b.{log,exit.json}`。测试夹具后续变化不影响此 UI 门禁。
- **原生首次发送已通过：** Aino `aae34d629b` / API `acc7fc760` 修复后，无 BYOK 登录、选择、创建、绑定和实际 Python Agent `read_file` 往返成功；两条 usage、一个 turn，余额 `10.00000000 → 9.99980000` 与消费 `0.0002000000` 一致，聊天已显示费用。随后测试在停止阶段因两个同名按钮导致 strict locator 失败，实际没有点击 Stop；finally 模拟流未释放引发清理超时并遮盖原错，正修测试夹具，不归为已证明的业务取消缺陷。证据 `/private/tmp/aino-native-scope-fixed-HkCZGx/`、隔离 API `aino-native-api-Wup2Ny/native-failure.json`；进程已退出、Docker 清空。后续充值/重启尚未运行。
- `aae34d629b` 只修改 `session.ts` 和测试：同一个明确 local/default 从 legacy 到 registry 描述符时保留 model/provider/owner/origin/source 和选择 generation；不同 profile/remote/source 仍按原隔离重置。真实 store RED→GREEN、106 项测试、相关 lint/renderer tsc 和独立复核通过。原生分段诊断的三个临时代码块已全部移除，新构建不含诊断。
- 一次有界诊断进一步排除账户/origin 不符：capture 与 prepared 的 revision 都为 4，三项用户/站点比较全部匹配，但选择 generation 从 1 变为 2。证据 `/private/tmp/aino-native-firstsend-probe-t7CykB/` 与隔离 API 诊断目录 `aino-native-api-upGfZe`。三个临时诊断源码修改已全部移除；当前修复聚焦普通本地连接转为 registry 描述符时的同路由选择保留，不删除跨账户或真实工作区切换保护。
- **最新原生复验失败，不能判定首发已修好：** Aino `3852268039` / API `acc7fc760` 新构建后运行 1.8 分钟、exit 1，仍在首次发送出现账户归属提示；账户保持 signed_in/revision 4，API 模型、工具、用量和支付均为 0。上述单测修复证明了一个真实状态版本边界，但不是该原生故障根因的证据。停止无变更重跑，改查完整消费者链路。原始日志 `/private/tmp/aino-native-owner-fixed-dGx4Xu/native.log`，测试容器已清空。
- `dc693231ec` 在托管新会话发送前复用账户刷新与目录重载，修复漏收主进程账户 revision 发布时的误拒绝；`3852268039` 保证默认模型也比较刷新前后的用户与精确 origin，真实换账户在 create/ticket/bind 前停止。实际 picker 首发 RED→GREEN，补充 active/history 新 tile 跨账户 RED→GREEN；最终 session-actions 112 项、三个 TS 配置及相关 lint 通过，独立复核通过。原首轮 157 项来自工具输出，未另存 raw；P1 原始日志 `/tmp/aino-native-firstsend-owner-fix-p1-{tests,eslint,typecheck}.log`。新隔离原生测试证据目录 `/private/tmp/aino-native-owner-fixed-dGx4Xu/`，不覆盖先前失败现场。
- 最新原生运行使用 Aino `aa3c57d989` / API `acc7fc760`：真实随机验证码登录、无 BYOK 进入工作区、目录选择及进程隔离证明通过，但首条发送被错误判为“模型属于其他账户”。失败时仍为同一已登录账户，模型/工具/消费/支付均为 0；已转入定向修复，不通过放宽归属检查或延长等待掩盖。日志 `/private/tmp/aino-native-final-pgkZu4/native.log`，API 正常退出且测试容器清空。完整业务闭环仍未通过。
- `43d9647bc4` 修复首次创建期间账户变化，176 项覆盖测试及独立复核通过；`2ae8bd896f` 让退出立即撤销本地模型授权，不等待远端注销，32 项 Electron 与 2 项 Python 断开合同通过，独立复核通过。`6e442f68a7` 仅修测试空行。完整 UI 874 文件/7,969 项通过，107.46 秒；完整 Electron 167 文件/2,262 项通过、2 文件/6 项原有跳过，3.53 秒。最终完整 lint 为 0 errors/187 warnings，全部桌面类型检查通过。日志 `/tmp/aino-ui-final-43d9647bc4.log`、`/tmp/aino-final-2ae8bd896f-{test-desktop-platforms,fixed-lint,fixed-typecheck}.log`。
- API `1c23701814` 去除旧 Login2FA 日志的令牌片段和邮箱，运行时日志捕获测试、handler 完整测试、vet/lint 和独立复核通过；`acc7fc760` 将测试无效 TOTP 改为确定性非数字输入。`c807e8113` 保存真实 API 原生夹具，普通相关集成 8.766 秒通过，不代表原生完整流程通过。
- D1 新构建 types/renderer/main 通过后，因夹具复核发现 API runtime HOME 未隔离及重启审计遗漏主动停止。全部所属进程退出，测试容器清空；证据 `/private/tmp/aino-final-run-bkBrLA/controller-stop.json`。只修测试夹具后再做一次有界验证，不能登记该次业务通过。
- D2 已真实执行生产构建与 macOS arm64 打包，两项 exit 0；产物在 `/private/tmp/aino-d2-packaged-2KZLA5/artifact/mac-arm64/Aino.app`。默认烟测发生辅助进程沙箱初始化崩溃；一次有界诊断后，显式测试用 `--no-sandbox` 配合不变的外层 OS 网络/凭据限制，10.31 秒 smoke 通过。实际 `isPackaged`、app.asar、340×603 登录窗口、production adapter/origin 和安装戳相等已验证，截图已目视检查；无 page/console errors。此结果不覆盖默认 Chromium 内层沙箱、签名、公证或正式发行。受控回执 `/private/tmp/aino-d2-packaged-2KZLA5/evidence/causal-no-chromium-sandbox/result.json`，归档 SHA-256 `0660aaa5ff17ec232a3065164dd8869aa99e0d16b3f9c9de35929c737b663f4d`。未安装到用户应用目录。
- `8393afa9c1` 四项模型恢复修复已通过针对性复核；`816906f757` 补齐默认值和历史的精确站点归属，9 文件/177 项定向测试及类型检查通过。独立复核发现首次创建会话期间丢失捕获的账户 revision/origin，正在定向修复，不把候选视为最终完成。
- 最终 UI 首轮完整运行（`816906f757`）：873 文件通过/1 文件失败，7,964 项通过/2 项失败，102.51 秒。失败来自 `session-request-router` 的旧测试数据缺少 `platformOrigin`；保留拒绝未知归属的生产约束，补齐测试真实字段。完整 lint 为 6 errors/197 warnings，5 项新增测试格式问题及 1 项旧未使用 import 正在修复，不批量改无关警告。日志 `/tmp/aino-{ui,lint}-final-816906f757.log` 和对应 `.exit.json`。
- API 全分支复核已完成，没有新增阻塞项。已应用迁移 239 的五处空白格式保留 checksum，不为 diff 检查重写迁移；旧 Login2FA 日志中的临时令牌片段/邮箱正在单独清理。新增原生 API 夹具通过独立复核，随后增强前序 assistant 工具匹配和实际取消计数，相关 `TestAinoPlatform` 8.766 秒通过；完整原生取消/账本流程未运行。
- API `414175e9f` 补齐隔离备份恢复并通过独立复核：真实 `pg_dump`→另一个空 PostgreSQL 容器/数据库的 `pg_restore`→全新 Redis 和归档实际服务启动，6.514 秒通过；身份、余额、订单、订阅、Key 撤销与迁移 checksum 保留，恢复后再次收到同一签名回调不会二次入账。相关 Go lint 0 issues。回执 SHA-256 `92ccdb38cb57a00b6b1dfd2bd4f98c1e78ddacdcd1e12239784b932bdc0f3aaa`；不是生产备份/恢复或在途付款截止点演练。
- `4cc2fcf58f` 模型能力/恢复候选已有 305 项定向测试、类型和 lint 通过，但独立复核发现四处未覆盖链路：resolved bind 错误码白名单、按错误类型恢复、两种 picker 的 reasoning 一致性、无默认模型的终态提示。正在定向补齐，不能据测试数宣布此阶段完成。精确平台 origin/历史归属是下一切片。
- 原生测试夹具补齐 Chromium 启动与重启隔离：测试入口在导入真实 main 前安装所有 session 的外连拦截。实际 Electron RED 在探测前拒绝未安装拦截器；GREEN 1 项/1.9 秒通过，实际 `net.fetch` 被 `ERR_BLOCKED_BY_CLIENT` 阻止，Python 凭据进程零启动断言保留，E2E 类型通过。日志 `/tmp/aino-d1-chromium-guard-{red,green,typecheck}.log`；仅证明测试隔离，不代表业务闭环通过。
- `07b77b40b1` 修复首次登录后的旧供应商引导阻塞：当前账户有可用内置模型且实际目标后端支持绑定时，可直接进入工作区；不写全局 BYOK 已配置/跳过标记，手动供应商设置和正在进行的认证流程保留。旧行为 2 项失败，修复后 36 项相关测试、类型/lint 通过，独立复核通过。完整原生复验待后续 B6 稳定树构建。
- API `997e0635b` 已补齐并复核回退期签名回调：关闭新充值后旧二进制仍接受原订单合法回调，隔离余额从 `11.25000000` 变为 `19.00000000` 一次；重复回调和恢复新版均保持同一订单/账本状态，新建充值仍返回 403。实际归档二进制演练 7.791 秒通过，三进程均 exit 0；回执 SHA-256 `2c2fa0454e7cfdb12d910df4784a32adf2a6f5f2ddd4ad4abdd2cd4c2e4bdcc8`。仅隔离本地合成渠道，未验证真实渠道、备份恢复或生产发布。
- 原生第 4 次使用真实界面关闭“记住登录”后，实际 API 登录和 backend 启动成功；完整流程停于旧供应商引导，模型/用量/支付仍为 0。此阻塞已由上方 `07b77b40b1` 定向修复。第 3 次“记住登录”长等待的根因仍未确认，未用延长超时/跳过断言掩盖，也未把仅本次登录记成自动登录恢复验收。
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

此前阶段门禁（最新结果以上方为准）：

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

下列为 2026-09-15 的历史核查；后续自有仓库地址为
`https://github.com/OneWhitepaper/Aino.git` 与 `https://github.com/OneWhitepaper/Aino-API.git`。

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

## B：内置模型与运行时（2026-09-15 历史记录）

以下保留 B2 完成时的记录；B3–B6 后续实现与当前验收状态见文档顶部，不作为当前待办。

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

此节为 B2 历史记录；后续 B3–B6 的完成证据与剩余原生验收见文档顶部。

---

## C：钱包充值与对账（历史记录）

C1–C4 后续本地实现与定向验收记录见文档顶部；真实支付仍未验证。本节不再保留已过期的实施待办。

---

## D：验收、发布与交付（历史阶段记录）

以下为进入最终验收前的历史状态，不作为当前待办。当前 D1–D4 进度及未通过门禁见文档顶部和验收矩阵。

---

## 问题和阻塞项（历史交接，已由顶部最新状态覆盖）

### 当时记录的问题
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
