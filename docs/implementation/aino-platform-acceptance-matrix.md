# Aino 平台验收矩阵

## 本轮剩余模型边界与最终本地回归（2026-09-17，优先于历史记录）

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

核对日期：2026-09-17。状态：执行中，不是上线验收通过单。

本表逐项对应 [D 计划](../aino-platform/04-delivery.md) 的矩阵。已有分层测试不等于整条业务链通过；“部分”表示已有对应证据，但该行仍有未验证条件。尚未执行的真实短信、付费模型、支付或生产操作一律不计为通过。

本轮新增工作区独立原生切片 E21、充值后双端独立切片 E22、完整 UI E23、清理修复 E24 和最终开发构建 E25。E19 网站独立登录/余额、E20 引导修复及其旧失败现场继续保留；E20 当时未执行的工作区工具/双窗口/隐藏恢复已经由 E21 补齐，充值后网站核对由 E22 补齐。各条只覆盖实际执行的场景，不外推远程、并发刷新/退出或真实供应商。

最新已验证业务检查点：Aino `8e8699e4b1` 的完整 UI 和工作区原生切片；跨端充值业务 `0eace11bfc` / checkout `3300447627`；API 测试夹具 `a5f720aa8`（API 业务仍为 `acc7fc760`）。两仓库均为 `codex/aino-platform-identity-models-billing`。旧核心原生夹具 `32c0ca8eae` / `ff00058c3` 为 1/1、2.4 分钟、exit 0，包含首发/工具/停止结算/充值/重启历史重绑定/BYOK/秘密审计，重启为新短信重新认证；历史 Electron 2,262 项仍对应其原检查点。后续清理修复 `3517ccfd3b` 的 124 项定向测试/类型/lint 及独立复核已通过，最终开发构建 E25 也已完成；实际安装包仅有旧受限烟测，正常发行不计通过。

## 证据入口

| 编号 | 证据 | 适用边界 |
| --- | --- | --- |
| E1 | [阶段进度](aino-platform-progress.md)：A1–A6、B2 记录 | 真实隔离 PG/Redis/JWT 身份与租约；外部短信为替身；原生账户独立夹具不是完整 API 闭环 |
| E2 | [B3 复核](aino-platform-b3-review.md) | main/HTTP/WS/ticket/bind、连接与主体隔离，不代表远程 TLS/SSH 人工验收 |
| E3 | [B5 验收](aino-platform-b5-review.md)、进度中的 B4 | 实际 Agent 三协议/工具与辅助模型分层测试，不是付费供应商回执 |
| E4 | 进度中的 B6；`8393afa9c1` 能力/恢复、`816906f757` origin 与 `43d9647bc4` 首次创建修复 | B6 本地实现和独立复核完成；`2ae8bd896f` 退出授权修复已复核；核心闭环 E18、工作区扩展 E21，异常/远程/并发等剩余条件按下表 |
| E5 | 进度中的 C1–C4 | 真实账本/报价/订单/回调分层测试及实际渲染；本条为分层证据；后续核心 Electron 串联见 E18 |
| E6 | API `97e4a4812e`：`TestAinoPlatform*`；`/tmp/aino-d1-native-api-regression.log` | 实际 API 内部服务、工具协议往返、两次扣费和一次加款；此 API 场景没有运行 Python Agent |
| E7 | 原生首跑 `/tmp/aino-d1-native-run1.log`；修复 `8b53794e1f` | 首跑停在合法空昵称解析；16 项测试和真实 API 客户端复验通过，完整 Electron 复验未运行 |
| E8 | C4 `7a215f2b11`；`/tmp/aino-c4-byok-round1-final-{python,ui,types,lint}.log` | 76 项 Python、39 项 UI、三个 TS 配置通过；费用来源两项问题独立复核关闭，无新增问题 |
| E9 | [质量复核](aino-platform-quality-review.md)、[Python 夹具](aino-platform-python-fixtures.md) | 已修失败和已运行门禁；不替代最终稳定树全量回归 |
| E10 | API `af10f7721`/`997e0635b`：`TestCompatibleOldServerRollbackRehearsal`，最新 7.791 秒，复核通过 | 归档当前→兼容旧版→当前；数据/撤销/关闭策略、保留签名回调一次入账，不含备份或真实部署 |
| E11 | 原生第二次 `/tmp/aino-d1-native-run2.log` | 固定构建后在登录前的拦截器加载断言失败，12.9 秒退出；模型/支付/用量均 0，不是原生闭环通过 |
| E12 | 原生第四次 `/tmp/aino-d1-native-run4.log`；引导修复 `07b77b40b1` | 真实 session-only 登录成功，但旧供应商引导阻塞；36 项相关测试/类型/lint 和独立复核通过，待原生新构建 |
| E13 | API `414175e9f`；`/tmp/d3-backup-restore-final.log`；独立复核通过 | 真实 pg_dump/pg_restore 至不同空库，全新 Redis/实际服务启动，身份/账本/checksum 和恢复后回调只入账一次；6.514 秒、lint 0 issues，非生产备份 |
| E14 | 源码 `6e442f68a7` 实际 macOS arm64 包，`/private/tmp/aino-d2-packaged-2KZLA5/evidence/causal-no-chromium-sandbox/result.json` | 受限烟测 10.31 秒通过；真实 packaged/production guard/安装戳/登录窗口，外层 OS 隔离保留；未验收默认 Chromium 沙箱、签名/公证或发行 |
| E15 | Aino `aa3c57d989` / API `acc7fc760`；`/private/tmp/aino-native-final-pgkZu4/native.log` | 随机 OTP 登录、无 BYOK 工作区、模型选择与首个 Python 进程隔离通过；首次发送账户归属误报，模型/工具/用量/支付均 0；完整闭环失败、后续步骤未执行 |
| E16 | Aino `aae34d629b` / API `acc7fc760`；`/private/tmp/aino-native-scope-fixed-HkCZGx/` | 修复同 local/default 作用域提升后，真实首次发送/Agent 文件工具往返/2 usage 与 0.0002 USD 对账成功；停止按钮测试定位歧义和清理超时，充值/重启未执行；不计整条通过 |
| E17 | Aino `dc3f0812d1` / API `ff00058c3`；`/private/tmp/aino-native-money-fixed-HiLLwQ/` | 真实停止断连、有限终态用量、三条 settled usage 共 0.0003 USD，充值 2.8 USD 一次入账/重复回调不加款、桌面/API 余额 12.79970000 相等；随后仅字体请求拒绝审计失败，重启/BYOK 未执行 |
| E18 | `3e62f7803d`＋test-only diff（后提交为 `32c0ca8eae`）/ API `ff00058c3`；`/private/tmp/aino-native-final-verified-Os7n6L/`；[脱敏回执](aino-platform-native-acceptance-20260917.json) | 现有原生用例完整通过：5 usage/3 turn、消费 0.0005 USD、最终余额 12.79950000；重启重新认证及新 Python 进程历史重绑定，BYOK 回复且平台消费不增加，三次启动和落盘/日志秘密审计通过。367 个 dist 哈希不变；字体早期拒绝，不代表成功联网加载。原生工作区切换、网站钱包 UI 不在该用例中 |
| E19 | 网站独立回执 [JSON](aino-platform-website-acceptance-20260917.json)，`/private/tmp/aino-website-refreshed-TwPE3S/` | 真实 Vue 网站独立随机短信登录、JWT 刷新账户、显示 10.00 与账本一致；网站 context HTTP/WS 外连拒绝数均 0，未进行充值/模型调用，不是 OS 进程全流量审计 |
| E20 | 引导修复 `0eace11bfc`；`/private/tmp/aino-native-onboarding-fixed-9OPrtN/` | 历史证据：8 项聚焦测试与复核通过；新 profile 首页/同账户同余额可用，整体 exit 1 于 guard 路径检查；后续工作区流程的成功证据见 E21 |
| E21 | 业务 `8e8699e4b1` / API `a5f720aa8`；[工作区回执](aino-platform-workspace-acceptance-20260917.json)；`/private/tmp/aino-workspace-final-eqiGqW/` | 1 项/22.5 秒/exit 0；真实独立 Python profile 后台完成工具往返、返回默认、双窗口账户/钱包一致、隐藏恢复；2 usage/0.0002 USD，余额 10→9.9998，renderer/peer/落盘与网络审计通过；非远程或并发刷新退出验收 |
| E22 | 业务构建 `0eace11bfc`、checkout `3300447627` / API `a5f720aa8`；[跨端充值回执](aino-platform-cross-client-recharge-20260917.json)；`/private/tmp/aino-cross-client-audited-fEaG6H/` | 1 项/1.3 分钟/exit 0；一笔订单/一次支付调用，重复签名回调只入账一次；桌面与独立 Vue 登录账户/余额一致，10→12.80 USD，模型调用/usage 均 0；供应商为 loopback 替身，不证明后续 renderer 修复 |
| E23 | 业务 `8e8699e4b1`；`npm run test:ui -- --maxWorkers=4`；[接续验证回执](aino-platform-continuation-validation-20260917.json)，原始 `/private/tmp/aino-ui-final-continuation-hMD5xI/{ui.log,ui-exit.json}` | 完整 UI 874 文件/7,979 项通过，exit 0；Vitest 354.69 秒，外层命令 355.49 秒；不覆盖后续清理修复、Python 整套、签名包或全部原生矩阵 |
| E24 | 清理修复 `3517ccfd3b`；[接续验证回执](aino-platform-continuation-validation-20260917.json)；独立 `delivery_audit` APPROVED | 2 项行为 RED（只有 release、缺 close）→3 文件/124 项通过、4.58 秒，包含真实 profile-rail 集成；三个 TS 配置通过、scoped lint 0 errors/0 warnings；关闭唯一 P2 |
| E25 | 业务 `3517ccfd3b` / API `a5f720aa8`，E2E 夹具 `855edc2e1d`；[接续验证回执](aino-platform-continuation-validation-20260917.json) | 最终开发构建：renderer Vite 外层 11.142 秒，显式 Electron tsc、main/preload `--dev`、stage-native-deps、assert-dist-built 均 exit 0；395 文件 dist 清单/日志哈希已记录；没有新安装包或新原生验收 |
| E26 | `9cb574c2dd` SQLite、`0eca169be6` 测试 guard；[修复报告](aino-platform-sqlite-recovery-20260917.md) | 活库 inode/SHM 竞态有原生 VFS 与 RED/GREEN 证据；新较广 18,593/1/209 无 SIGBUS，guard 后另 41 项通过，非整套绿；原历史 fault inode 不可追溯 |
| E27 | 菜单 `28f5f37f48`、测试修正 `246cffe9b2`；[本轮回执](aino-platform-account-edges-validation-20260917.json) | React Compiler 下冷启动／换源／重拨 RED→GREEN，33 项聚焦通过；完整 UI 7,982/1，唯一同毫秒排序测试修正后 115 项通过；不改写原整套结果 |
| E28 | 构建 `246cffe9b2` / API `6ce52d674`；[并发回执](aino-platform-account-concurrency-20260917.json) | 27.0 秒通过：双窗口刷新／退出单飞、退出响应前原 runtime 清授权、迟到刷新明确拒绝、旧租约 401、消费不增；同命令后续 B 失败独立保留 |
| E29 | 构建 `d0d6ebe038`、E2E `62d3507b24` / API `6ce52d674`；[恢复回执](aino-platform-account-recovery-20260917.json) | 同账户断网保留、账户 Retry／钱包 Refresh、原请求被真实撤销拒绝、可操作恢复、无自动重放、主动新发送才消费；onboarding 13 项定向／复核通过，供应商为替身 |
| E30 | [本轮构建与验证回执](aino-platform-account-edges-validation-20260917.json) | 两个开发构建各 395 个 dist 文件、7 步均 exit 0；精确源与manifest SHA分开保存。没有新发行包，API新增仅测试夹具 |
| E31 | [模型错误恢复](aino-platform-model-failures-20260917.json)，构建 `51ef28264a`／API `4dcbb1b34` | 原生余额不足、429 冷却、上游503→客户端502与显式恢复；拒绝无结算，不外推工具已执行后的重放安全 |
| E32 | [账户隔离](aino-platform-account-isolation-20260917.json)，构建 `420836fafd`／API `4dcbb1b34` | 同站点真实用户1／2的独立应用并发、每人2usage／0.0002USD；旧历史只读，普通点击新建会话恢复；非共享Python／晚到租约证明 |
| E33 | [站点隔离](aino-platform-origin-isolation-20260917.json)，构建 `420836fafd`／API `4dcbb1b34` | 两个站点真实用户均1，选择性释放另一站点仍0usage；同沙盒换站点重启保留旧历史并拒绝发送，当前站点新会话恢复 |
| E34 | [最终回归](aino-platform-final-regression-20260917.json)，冻结 `420836fafd`／`4dcbb1b34` | Python1624文件18708／0／217，完整UI875文件7985通过，Electron2262／6跳过、3TS、lint0错误187警告；开发构建395文件，非完整发行门禁 |

`/tmp` 是本机原始证据，不保证随源码交付。E18/E19/E21/E22 已保存脱敏回执与哈希的受控副本；E23/E24/E25 使用接续验证回执汇总精确源码及结果，原始日志另保留本机路径；完整原始 trace/临时凭据不入 Git。较早阶段仍以各自证据入口为界，不能因临时文件丢失补写成功记录。

## 账户与桌面

| ID | 当前状态 | 已有证据与尚缺条件 |
| --- | --- | --- |
| AUTH-01 | 隔离自动化通过 | E1/E6：随机 OTP、唯一用户、真实 JWT/刷新；阿里云送达未验证 |
| AUTH-02 | 隔离自动化通过 | E1：已有手机号仍同一用户，不重发赠金；正式账户未操作 |
| AUTH-03 | 隔离自动化通过 | E1/E6：旧账户绑定和 pre-239 升级保留 ID/余额；真实第三方登录未验收 |
| AUTH-04 | 隔离自动化通过 | E1：冲突、主体篡改、并发绑定拒绝，无账户或余额合并 |
| AUTH-05 | 隔离自动化通过 | E1：真实 Redis 限流与一次性消费，不以进程内 mock 替代 |
| AUTH-06 | 隔离自动化通过 | E1：错误耗尽、过期、手机号变化；不延长旧挑战 TTL |
| AUTH-07 | 隔离自动化通过 | E1：purpose/主体/认证会话绑定，串用拒绝 |
| AUTH-08 | 隔离自动化通过 | E1：Redis/发送故障、结果未知、重试边界；供应商真实故障未演练 |
| AUTH-09 | 部分 | E1/E14：开发/生产 origin 和固定码约束有自动化，实际包拒绝开发 adapter/origin；默认内层沙箱与正式环境仍未验收 |
| AUTH-10 | 隔离自动化通过 | E1：注册、邀请码、协议、封禁与 TOTP；正式 captcha 配置未验收 |
| AUTH-11 | 隔离原生及分层通过 | E1/E7 占位邮箱隔离与空昵称解析；E18 phone-only 实际登录/重新登录及业务回合通过；真实邮箱绑定以 E1 分层覆盖为界 |
| AUTH-12 | 隔离自动化通过 | E1：最后可用身份保护，通用解绑与近期认证覆盖 |
| DESK-01 | 隔离原生通过 | E16 真实 API session-only 登录、工作区进入及首次工具聊天通过；不包括正式短信、记住登录延迟或发行安装包 |
| DESK-02 | 部分，本地 profile 切片通过 | E2/E4/E21：同一账户/余额在独立后台工作区和返回默认时保持正确，实际工具往返与扣费通过；SSH/远程等其他目标未完成 |
| DESK-03 | 隔离原生通过 | E28：两窗口并发各轮 refresh 单飞、logout 单飞，退出响应前清除原 runtime 授权、两窗退出、晚到 refresh 被拒绝且旧租约 401；未产生额外消费 |
| DESK-04 | 部分 | 实际 macOS 加密、重启恢复、退出清理已有 E1；Windows/Linux、拒绝/锁定 Keychain 未验证 |
| DESK-05 | 隔离原生通过 | E21 隐藏／显示保持账户及钱包；E29 真实 API 断连时同身份／工作区保留，账户 Retry 与钱包显式 Refresh 恢复。离线及目录恢复期间引导不再遮挡；非真实外网故障演练 |

## 模型与 Agent

| ID | 当前状态 | 已有证据与尚缺条件 |
| --- | --- | --- |
| MODEL-01 | 隔离原生通过 | E16 全新无 BYOK 通过实际登录/选择/绑定/首发并完成 Agent 文件工具往返；同路由提升修复 `aae34d629b`，正式模型服务单列待验收 |
| MODEL-02 | 隔离自动化通过 | E1/E6：目录/租约与真实 APIKey group/model gate；正式逐模型配置未验收 |
| MODEL-03 | 隔离原生通过 | E16/E17 工具/流式/实际 Stop 通过；真实下游断连触发有限上游终态 drain，三条 usage 全部结算且无超时/清理冒充成功；正式模型服务单列待验收 |
| MODEL-04 | 隔离原生及分层通过 | E1/E2/E3 字段白名单/跨进程边界；E18 三次启动和最终落盘秘密审计，E21 主/副 renderer 及分批整文件审计，E22 跨端充值审计均无测试平台凭据泄漏；不代表任意插件或 OS 级隔离 |
| MODEL-05 | 隔离原生及分层通过 | E1/E2/E6 过期、租约与普通 Key 隔离；E28/E29 真实 logout／session-family revoke 后旧租约与原推理 401；正式设备与真实服务未操作 |
| MODEL-06 | 部分 | E2：精确连接/主体授权和地址变化拒绝；真实 TLS/SSH 场景未人工验证 |
| MODEL-07 | 部分 | E3/E4 历史/压缩和归属分层验证；E18 重启后 fresh SMS 同账户、新 Python PID、历史重绑定及工具回合通过；原生压缩历史与自动记住登录不在该用例中 |
| MODEL-08 | 隔离原生及分层通过 | E4 切换事务、反向切换分层覆盖；E18 无 BYOK 首发后第三次启动引入自定义配置，经用户模型菜单选择并成功回复，平台余额/调用/usage 不增加且自定义配置保留 |
| MODEL-09 | 部分 | E3 默认来源/显式辅助及相关回归；E8 混合来源补丁独立复核通过，真实供应商扣费与完整原生场景未验证 |
| MODEL-10 | 部分，指定并发隔离原生通过 | E32/E33：同站点双用户、不同站点同数字ID的独立应用并发及旧历史恢复通过；晚到租约响应、共享后台多主体及其他拓扑未验收 |
| MODEL-11 | 部分，指定错误恢复原生通过 | E29 撤销恢复；E31 真实403余额不足、429遵守冷却、上游503→客户端502、有限重试及显式恢复通过；其他断流形态与内容／工具已执行后的重放安全不外推 |
| MODEL-12 | 部分 | E3 缓存／工具／历史；E26 修复 SQLite 活库竞态，新较广回归未见 SIGBUS；E34 新计划范围 Python18708／0／217 与完整UI7985通过，E29／E31–E33原生切片通过；其余原功能原生QA仍未外推 |
| MODEL-13 | 部分 | E3 短期授权不能持久后台任务、BYOK 路径保留；完整 cron/Bot 长时实测未进行 |

## 钱包与支付

| ID | 当前状态 | 已有证据与尚缺条件 |
| --- | --- | --- |
| MONEY-01 | 隔离原生及分层通过 | E5 现金/冻结/订阅及 USD/CNY 分开，E19 独立网站余额读取；E22 充值后桌面/独立网站/API 同账户且余额均 12.80 USD；不代表真实渠道到账 |
| MONEY-02 | 部分 | E5/E6：账本权威金额、倍率/报价关系和精确对账；正式逐模型阶梯/缓存账单待验收 |
| MONEY-03 | 隔离原生及分层通过 | E3/E5 多 call/晚到辅助/分页/pending；E18 为 5 call/3 turn 共 0.0005 USD、BYOK 不增加消费；E21 独立工作区 2 usage/0.0002 USD 与账本一致，非线上账单 |
| MONEY-04 | 隔离自动化通过 | E5：当前用户/Key 强制归属、专用头上游剥离、并发去重 |
| PAY-01 | 隔离自动化通过 | E5：报价不建单、不访问支付；原服务计算一致 |
| PAY-02 | 隔离自动化通过 | E5/E6：持久 UUID、多次/并发请求一个订单，修改输入拒绝 |
| PAY-03 | 隔离自动化通过 | E5：未知结果恢复同商户单，响应永久丢失可从匹配历史恢复；未用真实支付实验 |
| PAY-04 | 隔离原生通过 | E17/E18 实际原生订单/COMPLETED/余额读取；E22 一笔订单/一次支付调用、重复签名回调仅入账 2.8 USD 一次，桌面/网站/API 余额一致；供应商为本地替身 |
| PAY-05 | 隔离自动化通过 | E5/E6：伪造/并发/重复回调与恢复查询竞态；只有一次实际加款 |
| PAY-06 | 部分 | E5 关闭重开、恢复、取消/状态接口测试；真实过期/退款渠道未验收，未擅自退款 |
| PAY-07 | 隔离自动化通过 | E5：订单 owner、安全 checkout URL 与原生打开边界；真实支付页未打开 |
| PAY-08 | 隔离自动化通过 | E5：支付关闭仍可查余额/历史，渠道不足不显示假成功 |

## UI、升级与发布门禁

| ID | 当前状态 | 已有证据与尚缺条件 |
| --- | --- | --- |
| UX-01 | 部分 | E5 实际组件浅/深色及现有 tokens 验收；最终原生/打包窗口未完成 |
| UX-02 | 部分 | E1/E5 四语言、OTP/窄屏分层覆盖；新增 B6 恢复文案和最终键盘流程未完成 |
| UPGRADE-01 | 部分 | E6 旧 schema 升级、E10 二进制回退、E13 隔离真实备份恢复保留身份/账本/Key/撤销及回调一次入账；旧客户端完整人工流程、生产备份截止点仍未验证 |
| UPGRADE-02 | 部分 | E4 已把实际 socket 能力接到两种 picker、设置、默认与首次发送；旧事件拒绝、未知能力不发送有行为测试；完整旧版本原生交互未验证 |

额外发布门禁：最小短信灰度限制在 API `6f73d6a58` 已本地实现并独立复核通过，该提交完整 unit 门禁 56 包通过/0 失败。最新完整 Electron 在 `2ae8bd896f` 为 2,262 通过/6 原有跳过；后续主进程业务未改，本轮 E2E types/lint 和 3 项原生 guard/小数合同另有新证据。

Python 在 Aino `82e0ba3cc5` 的完整计划范围回归结果为 18,572 通过、3 失败、209 跳过，另 1 文件进程崩溃；后续 `5a7d7084c2`/`d0e248b758` 修正三项失败并通过 29 项定向回归和独立复核。此处为历史回执；后续 SQLite 因果修复与新较广回归、guard 定向关闭见 E26，不将两份运行合并写成整套全绿。TTFB 文件使用原有 300 秒预算在 183.67 秒通过，无修改/重试。日志 `/tmp/aino-d2-python-final-82e0ba3.log`。

API `6f73d6a58` 的完整 integration 已通过：50 包通过/59 包无测试，0 失败，实际隔离 PG/Redis；兼容回退 E10、核心原生 E18、工作区 E21、跨端充值 E22 各自保留精确范围。完整 UI E23 在 `8e8699e4b1` 上 874 文件/7,979 项通过、exit 0，后续清理修复 E24 在 `3517ccfd3b` 上通过定向测试和独立复核；此前 `0eace11bfc` 的 300 秒超时为历史。打包产物/哈希见 E14，正常签名发行启动与矩阵其余原生场景仍未完成。网站 2,139 项及相关 types/lint/build 保留其原检查点，E19/E22 另有真实网站独立登录与充值后余额证据。

真实服务门禁仍全部独立待授权/待材料：正式模板正文与变量、短信接收范围及次数、逐模型预算、支付账户/金额/渠道、预发布/生产目标、协议与支持入口。当前不得宣布可正式上线。

2026-09-17 首轮定向诊断（历史，已由 E26 后续证据覆盖）：Python 原生 fault 位于 SQLite WAL 调用栈，系统报告映射 page-in past EOF；实际映射文件与导致越过 EOF 的操作/actor 未确定，不能单凭该错误预设 truncate。单次带时序实验排除了逐 fixture 删除目录的解释，没有复现 SIGBUS。打包 A/B 仅证明外层测试沙箱下的差异，不能归结为已证明的普通安装源码缺陷。当时两项门禁保持开放；当前 SQLite 状态见 E26，正常发行仍开放，详见[本地发行门禁记录](aino-platform-local-release-gates.md)。
