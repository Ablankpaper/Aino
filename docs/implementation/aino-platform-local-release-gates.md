# 本地发行门禁：定向诊断记录

## 本轮剩余模型边界与最终本地回归（2026-09-17，优先于历史记录）

用户本轮授权的第 1、2 项已完成。三条新增原生验收分别通过：[余额不足／429／服务异常恢复](aino-platform-model-failures-20260917.json) 36.949 秒、[同站点双账户隔离](aino-platform-account-isolation-20260917.json) 84.067 秒、[跨站点同数字 ID 隔离](aino-platform-origin-isolation-20260917.json) 88.198 秒（均为完整外层命令）。429 实测三次请求，间隔 2076／2068 ms；上游 503 真实转换为客户端 502。失败请求无结算，账户恢复不自动重放；主动 Retry／发送才发生工具回合。并发账本按用户、Key、会话与回合核对；跨站点仅释放一边时另一边仍等待且未扣费，旧归属历史只读，新会话恢复只向当前归属计费。

修复了原生发现的恢复按钮被输入框拖拽层遮挡：`420836fafd` 调整提示层级，普通点击在两条隔离验收中成功。最终冻结源码 Aino `420836fafd`／API 夹具 `4dcbb1b34`；Python 计划范围 1,624 文件／18,708 通过／0 失败／217 跳过，未观察到 SIGBUS；完整 UI 875 文件／7,985 项通过；Electron 2,262 通过／6 跳过；三个 TS 配置、官方 lint 及 E2E lint 均 exit 0（官方 lint 0 错误、187 条当前警告）。[最终回归回执](aino-platform-final-regression-20260917.json)保存命令、计数、哈希、失败原因与独立复核。错误恢复原生使用先前同轮构建 `51ef28264a`，两条隔离使用 `420836fafd`；两个 395 文件开发构建均保存独立清单，不混记源码。

这些结果覆盖已授权的本地范围；供应商为 loopback 替身。晚到租约绑定响应、共享后台多主体、远程／其他 OS、长时任务、正常签名发行和真实供应商仍分别待验收。没有推送、部署或新安装包；历史 Python 18,593／1／209 与 UI 7,982／1 仍保留原失败记录。账本终态已验证，最终截图的费用标签刷新收敛不属于本轮断言。

核对日期：2026-09-17。本文区分已关闭的本地切片与尚未关闭的发行门禁，不是允许发行的证明。未修改生产沙箱、SQLite journal 模式或账户/账本逻辑；本轮已修复 SQLite 文件生命周期及桌面引导，也未运行真实外部服务。

## 前轮第 1、2 项完成记录（历史，原证据归属保留）

第 1 项已完成本地诊断与修复：`9cb574c2dd` 修复首次建库与零库隔离的竞态。实际 SQLite VFS 捕获了活库被换 inode、同一 SHM 的 32 KiB 活跃映射被缩到 3 字节；修复后定向观测为 0 次错误隔离、0 次 SHM 缩短。未自然复现历史 SIGBUS，无法追溯原 fault inode。新较广 Python 回归为 18,593 通过、1 失败、209 跳过，无 SIGBUS；唯一 LSP 测试清理失败由测试 guard 修复 `0eca169be6` 后以 41 项定向验证关闭，原整套结果仍记录 exit 1。见[SQLite 修复报告](aino-platform-sqlite-recovery-20260917.md)。

第 2 项两条隔离原生切片已分别通过：[并发刷新／退出](aino-platform-account-concurrency-20260917.json) 27.0 秒，验证双窗口刷新与退出单飞、退出响应前清除原会话授权、晚到刷新被拒绝、旧租约 401 且无额外消费；[断网／撤销恢复](aino-platform-account-recovery-20260917.json) 76.278 秒（外层命令），验证同一身份保留、账户 Retry 与钱包显式 Refresh 恢复、真实会话撤销拒绝原推理且无消费、重新登录不自动重放，下一次主动发送才新增两条用量。外部供应商均为 loopback 替身，真实业务运行在 Electron、Python Agent、API、隔离 PostgreSQL/Redis；双窗口提示、秘密与网络审计均通过。

本轮还修复了实际验收发现的两个界面问题：`28f5f37f48` 让菜单订阅真实连接身份，`d0d6ebe038` 防止离线及恢复加载期间引导遮挡账户操作。后者 13 项定向测试、类型/lint 与独立复核通过。完整 UI 在前者上为 7,982 通过、1 失败；测试专用 `246cffe9b2` 修正同毫秒消息排序假设后，115 项定向验证通过。没有将两套广泛运行改写为全绿。准确源码、失败及后续关闭证据见[本轮验证回执](aino-platform-account-edges-validation-20260917.json)。

配对来源：并发场景业务构建 `246cffe9b2`，恢复场景业务构建 `d0d6ebe038`／E2E `62d3507b24`，API 夹具 `6ce52d674`（生产 API 仍为 `acc7fc760`）。两个构建各 395 个 dist 文件，步骤均 exit 0，哈希分别保存；本轮未产生安装包，未推送、部署或调用真实收费服务。正常签名发行、多平台／远程、其余长时矩阵和真实供应商仍是后续独立门禁。

## 完整 UI：前次全绿与历史超时

前次完整 UI 在源码 `8e8699e4b1` 上使用 `npm run test:ui -- --maxWorkers=4` 独占运行，通过 874 文件/7,979 项，exit 0；Vitest 计时 354.69 秒，外层命令 355.49 秒，无超时。证据 `/private/tmp/aino-ui-final-continuation-hMD5xI/ui.log` 与 `ui-exit.json`。该结果关闭对应源码的 UI 切片，后续清理修复 `3517ccfd3b` 已通过 124 项定向测试/类型/lint 和独立复核，完整 UI 与新修复保持各自源码记录；不外推 Python 整套或正式发行。

以下为源码 `0eace11bfc` 的历史超时及定向核查，证据目录 `/private/tmp/aino-workspace-onboarding-fixed-iMxxR2/`。

| 命令/范围 | 实际结果 |
| --- | --- |
| `npm run test:ui`，外层 300 秒上限 | exit 143 / `ETIMEDOUT`，没有完整最终通过计数 |
| 下列四文件，`vitest run --project ui --maxWorkers=1`，仅一次定向核查 | 4 文件/20 项通过，14.06 秒 |
| `npm run typecheck` | 三个 TS 配置通过 |
| `vite build`、`node scripts/bundle-electron-main.mjs --dev` | 均 exit 0；renderer 构建 12.86 秒 |

历史全量运行中报错/超时的文件为 `config-settings.test.tsx`、`local-models-settings.test.tsx`、`summary-layout.test.ts`、`terminal-layout.test.ts`。当时未找到新 onboarding hook 的直接回归链，也没有证明仅为环境负载；后续四文件定向通过没有被当作全量通过。最新全量成功另由上方 `8e8699e4b1` 的完整结果证明。

两轮原始日志与退出结果分别保留，历史失败不覆盖。最新通过对应精确源码 `8e8699e4b1`；没有新的变更、失败或未解疑点时，不循环重跑已通过全量。

## Python SIGBUS 首轮诊断（历史；后续因果与修复见 E26）

保留日志中的命令范围是 `scripts/run_tests.sh tests/tui_gateway/ tests/agent/ tests/plugins/ tests/hermes_cli/ tests/run_agent/test_provider_fallback.py`，记录在 `/tmp/aino-d2-python-final-82e0ba3.log`。三项断言失败的后续 29 项定向修复回执见[验收矩阵](aino-platform-acceptance-matrix.md)，它们与本次原生崩溃是不同问题；不能把定向绿灯当成整套绿灯。

### 已确认的事实

- 崩溃文件为 `tests/hermes_cli/test_mcp_catalog_env_boundary.py`；当时前台正在导入 OpenAI/Pydantic，但 macOS 原生 fault 不在该导入路径。
- `.venv/bin/python` 与 `python-2026-09-16-190922.ips` 的 executable UUID 一致。运行时为 arm64 Python 3.11.15、内置 SQLite 3.53.1。
- faulting thread 为 SQLite `pagerWalFrames → sqlite3PagerCommitPhaseOne → sqlite3BtreeCommitPhaseOne → sqlite3_step → pysqlite_cursor_executescript`。
- 系统报告 `SIGBUS`、`FS pagein error: 22` 和 `cluster_pagein past EOF`，fault 地址位于 32 KiB 文件映射内。映射大小及调用栈与 SQLite WAL 的 `-shm` 相符，但报告没有保留映射文件名。page-in past EOF 不能单独区分 backing vnode 后来缩短、初始映射越过 EOF 或其他文件/VM 路径，也不能归因具体 actor。
- `TestClient` 启动的 `statedb-eager-reconcile` 与 `hosted-room-startup` 两个后台线程同时初始化同一路径的数据库。eager 线程没有在 lifespan teardown 中被等待结束。

### 单次有界实验

通过官方 runner 运行临时诊断文件，关闭自动重试；没有直接使用 pytest，也没有修改生产源码。临时文件已经删除。

```sh
HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh tests/hermes_cli/test__diag_python_bus_lifespan.py -vv -s
```

该实验让两个真实 schema 初始化器在同一 barrier 相遇，记录 DB/WAL/SHM 的 inode 和尺寸，并观察 lifespan 退出与下一个 fixture 的开始。原始时间线：`/tmp/aino-python-bus-overlap-timeline.json`。

| 观察 | 结果 |
| --- | --- |
| 两个初始化器同时释放 | 间隔小于 0.015 ms |
| SHM 存在期间的 22 次采样 | 同一 inode，均为 32,768 bytes |
| lifespan 退出与下个 fixture 开始 | eager 线程仍存活；旧 HOME/DB/WAL/SHM 仍存在 |
| eager 被释放并正常关闭连接后 | WAL/SHM 正常消失 |
| SIGBUS | 本次没有发生 |

因此，“fixture teardown 删除临时文件导致本次 SIGBUS”的解释没有证据支持，并被该实验的时序反证。测试 runner 也是在整个 pytest 子进程结束后才删除 attempt 目录，而不是逐 fixture 删除。

注意：时间线证明两个诊断 test body 到达了断言/产物写入步骤；runner 显示 `(2 tests, 1.0s)` 进度估算标签，但 `-vv -s` 下汇总解析为 `0 tests passed / NO TESTS RAN`。这不是有效的 collected/pass 计数，只作为有时间线的诊断实验，不计为普通测试绿灯；未为获取绿灯重复运行。

### 首轮尚未确定项与当时建议（历史）

原始故障中映射文件的精确身份，以及导致 page-in past EOF 的机制/actor 仍未知。初始化器重叠、eager 线程跨 lifespan 存活是事实，但尚未证明它们导致了 SIGBUS。不能据此禁用 WAL、串行化生产启动或 stub 掉整个服务后声称根因已修复。

下一份有判别力的证据应先识别自然故障时的实际 mapped vnode，再追踪其 resize/truncate/unlink 等 OS 级活动与原生线程栈；只有跟踪结果证实后，才将它归因为 SHM 或特定文件操作。没有该证据时保持门禁开放，不继续无变化地循环整套测试。

## macOS 打包启动

已有产物：`/private/tmp/aino-d2-packaged-2KZLA5/artifact/mac-arm64/Aino.app`，源码检查点 `6e442f68a7`，arm64 Electron 40.10.2。它早于最新业务检查点，不能当成最新发行制品。

| 相同产物、相同外层隔离策略 | 结果 | 能证明什么 |
| --- | --- | --- |
| 默认 Chromium sandbox | Helper/target 启动失败 | 在测试外层 `sandbox-exec` 下失败 |
| 测试专用 `--no-sandbox` | 10.31 秒烟测通过 | 打包身份、生产 origin/adapter、登录窗口及安装戳在受限条件下可用 |

外层隔离在两次实验中均禁止非 loopback 网络、个人凭据/Keychain 访问及 `security` 执行。该 A/B 只说明测试外层沙箱与 Chromium 沙箱的交互，不证明普通安装一定失败，也不证明普通安装没有问题。

没有发现足以支持修改 macOS 生产启动参数或 entitlement 的源码根因。不移植 Windows 的 `--no-sandbox` fallback，不把测试开关带入发行。现有 unsigned/ad-hoc 目录产物的 codesign/spctl 不通过，仍不是正式签名/公证包。

正常发行验收仍需：

1. 使用授权的发行身份，从确定的最新配对提交构建并签名、公证。
2. 在隔离测试用户/临时数据环境中，用默认 Chromium sandbox、无 D2 外层 `sandbox-exec` 启动。
3. 记录 `codesign --verify --deep --strict`、`spctl --assess`、首窗及 helper 日志；失败时先取首个原生崩溃证据，再决定修复。

本轮没有执行签名、公证、安装到 `/Applications`、信任设置修改或生产部署。

## 工作区原生扩展：历史夹具失败（2026-09-17）

`0eace11bfc` 的新构建实际完成了 profile-only 工作区切换：聊天首页可见，账户和余额保持不变；随后旧测试夹具在读取命名 profile 的 Python 启动标记时以 `ENOENT` 退出。根因是 `sitecustomize` 在解释器启动时使用继承的根 `HERMES_HOME` 写启动 PID，CLI 后续才应用 `--profile` 切换到子目录；运行时阻断日志仍按当前 profile 写入。修正后的 helper 只把启动 PID 标记读回根目录，保留 profile `blocked-network.txt` 审计、精确 PID/进程起始标记和不同 nonce 约束。

短隔离 proof 已通过（1 项，424ms 总计），使用实际 `.venv` Python、临时 root/profile home 和生成的 `sitecustomize`：确认 PID 只出现在启动根目录、profile 不伪造启动标记，禁止地址在底层 connect 前被拒绝并记录到 profile；E2E typecheck 和 scoped ESLint 均 exit 0。独立 Spec/Quality review 为 APPROVED，报告见 `.superpowers/sdd/implementation-plan/guard-startup-home-review.md`。这只关闭测试夹具路径因果，不等于工作区 native、peer/hide-show、网站充值后串联或全量矩阵通过。

旧扩展原生用例 `/private/tmp/aino-native-onboarding-fixed-9OPrtN/` 的失败现场保留，没有覆盖重跑。后续采用独立 workspace slice，从工作区工具回合继续，已完成返回默认、第二窗口及隐藏/显示，结果见下节。

## 前次接续的已关闭切片（历史）

- 工作区完整独立用例：`8e8699e4b1` / API `a5f720aa8`，1 项、22.5 秒、exit 0；证据 `/private/tmp/aino-workspace-final-eqiGqW/`，受控回执 `aino-platform-workspace-acceptance-20260917.json`。从工作区切换到工具往返、回默认、双窗口、隐藏恢复、网络和全部落盘审计均执行。落盘 JSON 共 35,153,521 bytes，因此审计保持整文件并分 5 批，未提高服务端 32 MiB 限制；后续严格验证响应字段的短 proof 1 项、1.4 秒通过。
- 充值后跨端核对：`0eace11bfc` 业务构建 / API `a5f720aa8`，1 项、1.3 分钟、exit 0；证据 `/private/tmp/aino-cross-client-audited-fEaG6H/`，受控回执 `aino-platform-cross-client-recharge-20260917.json`。并发提交后的 checkout HEAD 与实际构建 SHA 已分别记录，未将旧构建算作新 renderer 修复验证。
- 临时诊断源码全部恢复，`8e8699e4b1` 构建确认不含诊断标记；该源码完整 UI 874 文件/7,979 项通过，Vitest 354.69 秒/外层 355.49 秒、exit 0，证据 `/private/tmp/aino-ui-final-continuation-hMD5xI/`。后续清理修复 `3517ccfd3b` 的 2 项行为 RED 后，3 文件/124 项通过（4.58 秒，含真实 profile-rail 集成），三个 TS 配置、scoped lint 0 errors/0 warnings、独立 `delivery_audit` APPROVED，唯一 P2 已关闭；旧核心短信/重启/充值流程没有重复运行。
- 前次开发构建 `3517ccfd3b` / API `a5f720aa8`：renderer Vite 外层 11.142 秒，显式 Electron tsc、main/preload `--dev` 打包、native deps staging、dist 检查均 exit 0，395 文件清单与日志哈希已记录；E2E 夹具提交 `855edc2e1d`。这不是新签名/公证安装包，也没有把旧原生验收移记到本次构建。

UI 与清理修复的精确源码及结果另汇总于[接续验证回执](aino-platform-continuation-validation-20260917.json)。本节覆盖前文“工作区后半段、充值后双端未运行”的历史状态；Python 后续修复及回归见本文顶部和 E26；默认沙箱签名公证包、多平台及真实服务仍未关闭。

## 本轮失败与关闭路径（E31–E34）

`0ZeaHc` 在已完成两边账本后因错误预期一次租约而失败；`fd42c7a41b` 按真实创建绑定＋首次发送前绑定，严格要求两次 credential requests/successes，模型推理仍只两次。`ga7XbG` 则已通过并发账本与旧历史禁发，但普通恢复点击被 absolute composer-drag-region 拦截30秒；`420836fafd` 将提示提至现有surface的z-4，3文件10项聚焦检查通过。最终 `kpUVFS`／`G5iMaU` 新构建普通点击与完整恢复通过，才关闭命中问题；没有用jsdom、强制点击或构建成功代替原生证据。
