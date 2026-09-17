# Aino 平台接入交付报告

## 本轮共享后台、迟到租约与 macOS 候选包（2026-09-17，最新）

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

状态：本地已验证切片已汇总，尚未达到正式发行或上线条件。最新核对日期 2026-09-17。[逐项验收矩阵](aino-platform-acceptance-matrix.md)记录各自源码、结果与未覆盖条件；清理修复 `3517ccfd3b` 的定向测试和复核已完成，最终开发构建和配对来源已记录，正式签名发行制品尚未验收。

本轮工作区与跨端充值验收分别见 E21/E22，完整 UI 见 E23。此前网站独立登录/余额 UI 1 项、37.6 秒通过以及 `0eace11bfc` 引导修复、8 项聚焦测试和独立复核保留为历史证据；原生 guard 启动标记路径错误是旧失败记录，其后续工作区工具、双窗口和隐藏恢复已在 E21 的新构建中实际执行通过。

**完整 UI 门禁已在 `8e8699e4b1` 通过：** 874 文件/7,979 项、exit 0，Vitest 354.69 秒、外层命令 355.49 秒。原始日志与退出回执位于 `/private/tmp/aino-ui-final-continuation-hMD5xI/`。此前 `0eace11bfc` 的 300 秒超时与四文件定向 20 项通过记录保留为历史；本次实际全量结果关闭该 UI 切片，不外推后续清理修复、Python 整套或正式发行门禁。详见[门禁记录](aino-platform-local-release-gates.md)。

历史核心原生闭环的业务代码 Aino `aae34d629b` / API `acc7fc760`；原生夹具 `32c0ca8eae` / `ff00058c3`。现有原生全流程用例已在 2.4 分钟通过：随机短信登录、无 BYOK 首发、实际 Agent 工具、停止结算、充值一次入账、重启重新认证/历史重绑定、BYOK 回复及全部三次启动/落盘秘密审计。平台 5 条 usage 合计 `0.0005000000` USD，最终余额 `12.79950000` USD，BYOK 前后不变。字体请求有发生但被早期拦截，不是零外部请求或成功下载字体。历史 UI 7,973 项、Electron 2,262 项及该阶段类型/lint 记录保留；该阶段 E2E types/lint、3 项 guard/小数合同、1 项核心原生全流程均通过。成功用例不等于整个 D 矩阵或正常发行验收，剩余条件如下。

## 前轮安装包边界（历史，新候选包见本文顶部 E37）

最新只读核验与 Python 单次定向诊断见[本地发行门禁记录](aino-platform-local-release-gates.md)。SQLite 后续已确认并修复活库换代／SHM 缩短竞态，回归与历史 fault inode 的证据边界见 E26；该结论不改变下述安装包限制。默认打包启动的现有失败只发生在 D2 外层 `sandbox-exec` 包装下，没有足够证据修改 macOS 生产 sandbox 策略。

产物：`/private/tmp/aino-d2-packaged-2KZLA5/artifact/mac-arm64/Aino.app`；源代码 `6e442f68a7`。生产构建和 builder 均 exit 0。初次默认启动在测试外层 sandbox-exec 下发生 Electron Helper 沙箱初始化崩溃；有界诊断后的受限烟测显式使用 `--no-sandbox`，外层 OS 非本地网络、个人凭据读取和 security 执行禁止仍有真实探测证明。

该次 10.31 秒、exit 0 验证真实打包身份、production adapter/origin、340×603 原生登录窗口及安装戳一致；没有 page/console errors。归档 `evidence/causal-no-chromium-sandbox/Aino.app.bundle.zip`（相对上述 D2 临时根目录），141,701,153 字节，SHA-256 `0660aaa5ff17ec232a3065164dd8869aa99e0d16b3f9c9de35929c737b663f4d`。对应 `result.json`、截图和首次失败证据保留，不覆盖。codesign/spctl 未通过是未签名目录产物的发行限制，未执行签名、公证、安装或信任修改。**此包不能作为已验收的正常发行包交付用户安装。**

## 版本与范围

| 仓库 | 分支 | 本次恢复基线 | 最新已核对提交 |
| --- | --- | --- | --- |
| Aino | `codex/aino-platform-identity-models-billing` | `ba76603774` | 最新构建 `a2ff532db2`；后续仅测试空行 `b0cd4e82e9`，E35–E37；前轮广泛回归／隔离原生 `420836fafd` |
| Aino-API | `codex/aino-platform-identity-models-billing` | `f6b8849e0` | `93082b333`（测试夹具）；生产 API 仍为 `acc7fc760`，无新迁移 |

当前 A1–A6、B1–B5、C1–C4 本地实现与已有复核保留；B6 主流程和 D1 现有原生用例已获得复验。D1–D4 完整矩阵仍有未验收条件，不能用单条成功路径全选通过。两仓库没有推送、合并 main、部署生产或进行真实短信、付费模型和支付调用。

历史核心原生证据：`/private/tmp/aino-native-final-verified-Os7n6L/`（命令/退出码/精确源码 diff/367 个构建文件哈希）；API `aino-native-api-9efh0G`。原始回执 SHA-256 `7b5872bb4a94e3700e07f7246a330fd4d5e082b6f9612f0137bd0ee729b9d80c`；[脱敏受控副本](aino-platform-native-acceptance-20260917.json)随源码保存。测试时为 `3e62f7803d` 加记录的 test-only diff，随后提交为 `32c0ca8eae`。重启使用 fresh SMS 重新登录，不宣称“记住登录”自动恢复。本轮工作区、跨端充值及 UI 的独立证据入口见矩阵 E21–E25。

## 已记录验证切片

以下保留各历史阶段的结果和当时限制；已关闭的问题以本文开头及进度文档最新状态为准，不需要重复执行这些阶段。结果只覆盖各自记录的代码切片，不代表最终树已经全绿：

| 范围 | 实际结果 | 证据/限制 |
| --- | --- | --- |
| 前次完整 UI 全绿切片（历史） | `8e8699e4b1`：874 文件/7,979 项通过、exit 0；Vitest 354.69 秒，外层命令 355.49 秒 | `/private/tmp/aino-ui-final-continuation-hMD5xI/{ui.log,ui-exit.json}`；后续清理修复的独立定向证据见 E24 |
| 前次完整 UI（历史检查点） | `aae34d629b`：874 文件/7,973 项通过，107.91 秒、exit 0 | `/tmp/aino-ui-final-aae34d629b.{log,exit.json}`；更新的完整 UI 结果见上一行 |
| 工作区引导修复 | `0eace11bfc`：真实 store/component RED→GREEN，8 项聚焦测试、类型/lint 和独立复核通过 | `/private/tmp/aino-native-onboarding-fixed-9OPrtN/` 新构建切换后聊天首页可用；扩展原生 exit 1 于 guard 路径检查，不是完整工作区验收 |
| 网站独立登录/余额 | Aino E2E helper / API `a5f720aa8`：1 项、37.6 秒、exit 0 | [受控回执](aino-platform-website-acceptance-20260917.json)；真实 Vue / JWT / 隔离账本，非充值后双端串联 |
| 历史核心原生全流程 | `32c0ca8eae` / `ff00058c3` 对应被测夹具：1/1、2.4 分钟、exit 0，含重启历史/BYOK/最终秘密审计 | `/private/tmp/aino-native-final-verified-Os7n6L/`；平台 5 usage/0.0005 USD，BYOK 不增加平台消费；供应商是本地替身 |
| 工作区原生独立切片 | 业务 `8e8699e4b1` / API `a5f720aa8`：1 项、22.5 秒、exit 0 | [回执](aino-platform-workspace-acceptance-20260917.json)；独立后台工具、返回默认、双窗口账户/钱包一致、隐藏恢复与秘密/网络审计 |
| 前次开发构建（历史） | 业务 `3517ccfd3b` / API `a5f720aa8`；renderer Vite 外层 11.142 秒，Electron tsc、main/preload `--dev`、stage-native-deps、assert-dist-built 均 exit 0 | [接续验证回执](aino-platform-continuation-validation-20260917.json)含日志哈希与 395 文件 dist 清单；E2E 夹具 `855edc2e1d`，非新安装包/新原生验收 |
| 导航失败清理修复 | `3517ccfd3b`：2 项行为 RED → 3 文件/124 项通过，4.58 秒；三个 TS 配置/scoped lint 均通过 | 独立 `delivery_audit` APPROVED、唯一 P2 关闭；含真实 profile-rail 集成，见[接续验证回执](aino-platform-continuation-validation-20260917.json)；不将旧全量/原生结果改记到本提交 |
| 充值后跨端独立切片 | 业务 `0eace11bfc` / API `a5f720aa8`：1 项、1.3 分钟、exit 0；checkout `3300447627` 单独记录 | [回执](aino-platform-cross-client-recharge-20260917.json)；一笔订单/一次支付，重复签名回调仅入账一次；桌面与独立网站均 12.80 USD，模型/usage 均 0 |
| 前次原生停止、账本与充值 | `dc3f0812d1` / `ff00058c3`：三条 settled usage 合计 0.0003 USD；停止后真实断连与有限 drain；一次充值 2.8 USD、重复签名回调只履约一次，桌面余额与 API 均为 12.79970000 USD | `/private/tmp/aino-native-money-fixed-HiLLwQ/`；完整用例在随后字体拒绝审计失败，重启/BYOK 未执行，非真实付款 |
| 原生首次工具回合 | `aae34d629b` / `acc7fc760`：无 BYOK 登录、模型选择/绑定、真实 Agent 文件工具往返、两条用量和余额对账通过 | `/private/tmp/aino-native-scope-fixed-HkCZGx/`，`10.00000000 → 9.99980000`；停止测试尚未实际点击，完整流程失败 |
| B4/B5 真实 Agent 与辅助来源 | 三协议工具往返、续租/恢复/取消/切换已有隔离测试；B5 131 文件/1,388 项通过 | [B5 记录](aino-platform-b5-review.md)，非线上扣费 |
| B6 固定发送时模型及原 socket | `52ec689c98`、`fde0064f71`；首发/恢复及 profile rail 修复已通过独立复核 | 默认作用域、切换及原生完整流程仍待完成 |
| B6 作用域与账户草稿 | `6acd2046ca`：13 文件/454 项通过，独立复核通过 | 精确开发 origin、模型切换/能力和完整原生验证仍待完成 |
| B6 模型切换事务 | `c83d5c1b71` 原实现；`82e0ba3cc5`/`c3daa97bef` 关闭四项问题，独立复核通过 | 实际保留动画 DOM 的菜单重开测试、99 项覆盖和真实 Agent 反向切换通过；完整原生链路单列 |
| B6 精确后端能力 | `911151ea09`/`ae59e82f52`/`5acc1c18b3`：163 项覆盖通过，4 项旧行为 RED→GREEN、类型/lint 和独立复核通过 | 连接生命周期/首次发送拒绝，不代表 vision/reasoning、错误恢复或 origin 隔离已完成 |
| B6 首次引导 | `07b77b40b1`：平台可用模型不再被旧 BYOK 引导阻塞；36 项测试、类型/lint 和独立复核通过 | 实际第 4 次原生暴露的问题，待新构建原生复验；不持久化伪 BYOK 配置 |
| B6 模型能力/恢复候选 | `4cc2fcf58f`：305 项定向测试、类型/lint 通过；独立复核要求修正四项实际消费者链路 | 错误码、正确恢复入口、两种 picker reasoning 与无模型终态；尚未批准完成 |
| B6 恢复修复第一轮 | `8393afa9c1`：6 文件/92 项测试、三个 TS 配置和 scoped lint 通过，已本地提交 | 已准备针对四项问题的独立复核，尚未执行；精确 origin/历史归属和原生闭环仍未完成 |
| 原生测试启动隔离 | 未提交测试夹具：实际 Electron 1 项/1.9 秒及 E2E 类型通过 | Chromium session 在真实 main 启动前即外连拒绝，重启复用同入口；非业务验收 |
| D3 兼容二进制回退 | 测试提交 `af10f7721`：归档 `6f73d6a58`→`78f962607b`→`6f73d6a58`，7.572 秒，三进程就绪/exit 0；独立复核通过 | 精确身份/账本/Key/撤销/关闭策略；不含回退期回调履约、备份恢复和真实部署 |
| D3 回退期保留回调 | `997e0635b`：同归档版本的一次 7.791 秒演练及独立复核通过 | 新充值关闭、旧订单合法签名到账一次、重复回调不重复加钱、恢复新版保留；备份/真实渠道/部署未验证 |
| D3 隔离备份恢复 | `414175e9f`：真实 dump→不同空库 restore→全新 Redis/实际服务，6.514 秒通过；tagged lint 0 issues，独立复核通过 | 状态/checksum 保持，恢复后重复签名回调不重复入账；不等于生产截止点、在途付款或灾难恢复验证 |
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

[用户指南](../aino-platform-user-guide.md)及 [API 部署与回退准备](../../../Aino-API/docs/aino-platform-deployment.md)已建立。最小灰度限制和兼容二进制回退已有本地证据；操作单不是部署回执，正式短信配置、真实灰度/渠道、多平台安全存储及生产回退不能填“通过”。

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
| 平台模型 | 实际 Electron/Python/API＋隔离 PG/Redis | 工具、Stop、重启历史重绑定、BYOK 费用隔离、工作区工具/返回默认、双窗口账户钱包一致及隐藏恢复通过 | 其他原生异常、远程、正式模型扣费与能力覆盖；本轮并发／断网／撤销恢复见 E28/E29 |
| 钱包充值 | 实际 Electron/API＋本地支付替身，以及独立 Vue 网站登录 | 原生报价/订单/签名回调一次入账、充值后桌面/API/网站账户与余额一致 | 真实支付宝/微信小额支付、真实退款与生产在途付款 |

## 待完成门禁

1. 核心原生、工作区工具/回默认/双窗口账户钱包一致/隐藏恢复、充值后网站独立核对均已有成功切片；本轮并发刷新／退出、断网与撤销恢复已补齐；其余异常、远程等矩阵条件继续开放，不重跑无变更的成功用例。
2. 原生 BYOK 与平台费用隔离、平台账本显示已通过；混合辅助来源仍以已有分层测试为界，不外推真实供应商扣费。C1–C4 稳定切片不重复重写。
3. 本轮 SQLite 竞态修复、测试 guard 与同毫秒排序测试修正均已定向关闭并复核。完整 Python 18,593/1/209、UI 7,982/1 的实际失败回执仍保留，后续 41／115 项分别证明关闭对应失败；不宣称最终树单命令全绿。详见本轮验证回执。
4. 正常发行包启动仍未验收：当前仅 `--no-sandbox` 配合外层 OS 限制的受限烟测通过；该 A/B 只证明外层测试隔离交互，不能断言普通安装的生产 sandbox 已有源码缺陷。最新签名/公证包须在默认 Chromium sandbox 下正常启动；生产备份截止点、真实渠道与生产回退未验证。
5. 本地配对业务/夹具提交、开发构建清单、配置和部署回退说明已记录；正式发行制品与线上配置仍须按操作单核对，新增 SQL 保持 forward-only。
6. 缺少外部材料或授权的项目列为人工验收项，完成其余本地开发；不盲目重复受阻命令。

## 发布判断

已验证本地隔离环境中的登录、聊天工具、结算、充值和跨端余额一致；不能将这些切片外推为正式服务已完整可用或全量 CI 已绿。正式上线前必须补齐模型分组/能力/价格配置、短信模板和供应商验证、支付渠道与协议配置，并在明确范围内取得真实联调证据，同时关闭正常签名发行启动及其余发行门禁。

回退必须保留新账户、订单和账本数据；停用新充值入口不能停止已支付订单的回调履约。API 操作单记录本地兼容演练 SHA 与二进制哈希；保留回调回执 SHA-256 为 `2c2fa0454e7cfdb12d910df4784a32adf2a6f5f2ddd4ad4abdd2cd4c2e4bdcc8`，隔离备份恢复回执为 `92ccdb38cb57a00b6b1dfd2bd4f98c1e78ddacdcd1e12239784b932bdc0f3aaa`。二者证明合成渠道的回调一次履约及独立数据库恢复，不覆盖生产备份截止点或真实在途付款，不能外推为完整上线回退验收。
