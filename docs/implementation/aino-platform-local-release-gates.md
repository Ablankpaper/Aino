# 本地发行门禁：定向诊断记录

核对日期：2026-09-17。本文区分已关闭的本地切片与尚未关闭的发行门禁，不是允许发行的证明。未修改生产沙箱、SQLite 模式或账户/账本逻辑，也未运行真实外部服务。

## 完整 UI：最新通过与历史超时

最新完整 UI 在源码 `8e8699e4b1` 上使用 `npm run test:ui -- --maxWorkers=4` 独占运行，通过 874 文件/7,979 项，exit 0；Vitest 计时 354.69 秒，外层命令 355.49 秒，无超时。证据 `/private/tmp/aino-ui-final-continuation-hMD5xI/ui.log` 与 `ui-exit.json`。该结果关闭对应源码的 UI 切片，后续清理修复 `3517ccfd3b` 已通过 124 项定向测试/类型/lint 和独立复核，完整 UI 与新修复保持各自源码记录；不外推 Python 整套或正式发行。

以下为源码 `0eace11bfc` 的历史超时及定向核查，证据目录 `/private/tmp/aino-workspace-onboarding-fixed-iMxxR2/`。

| 命令/范围 | 实际结果 |
| --- | --- |
| `npm run test:ui`，外层 300 秒上限 | exit 143 / `ETIMEDOUT`，没有完整最终通过计数 |
| 下列四文件，`vitest run --project ui --maxWorkers=1`，仅一次定向核查 | 4 文件/20 项通过，14.06 秒 |
| `npm run typecheck` | 三个 TS 配置通过 |
| `vite build`、`node scripts/bundle-electron-main.mjs --dev` | 均 exit 0；renderer 构建 12.86 秒 |

历史全量运行中报错/超时的文件为 `config-settings.test.tsx`、`local-models-settings.test.tsx`、`summary-layout.test.ts`、`terminal-layout.test.ts`。当时未找到新 onboarding hook 的直接回归链，也没有证明仅为环境负载；后续四文件定向通过没有被当作全量通过。最新全量成功另由上方 `8e8699e4b1` 的完整结果证明。

两轮原始日志与退出结果分别保留，历史失败不覆盖。最新通过对应精确源码 `8e8699e4b1`；没有新的变更、失败或未解疑点时，不循环重跑已通过全量。

## Python 整套运行的 SIGBUS

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

### 仍未确定与下一步

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

## 本次接续的已关闭切片

- 工作区完整独立用例：`8e8699e4b1` / API `a5f720aa8`，1 项、22.5 秒、exit 0；证据 `/private/tmp/aino-workspace-final-eqiGqW/`，受控回执 `aino-platform-workspace-acceptance-20260917.json`。从工作区切换到工具往返、回默认、双窗口、隐藏恢复、网络和全部落盘审计均执行。落盘 JSON 共 35,153,521 bytes，因此审计保持整文件并分 5 批，未提高服务端 32 MiB 限制；后续严格验证响应字段的短 proof 1 项、1.4 秒通过。
- 充值后跨端核对：`0eace11bfc` 业务构建 / API `a5f720aa8`，1 项、1.3 分钟、exit 0；证据 `/private/tmp/aino-cross-client-audited-fEaG6H/`，受控回执 `aino-platform-cross-client-recharge-20260917.json`。并发提交后的 checkout HEAD 与实际构建 SHA 已分别记录，未将旧构建算作新 renderer 修复验证。
- 临时诊断源码全部恢复，`8e8699e4b1` 构建确认不含诊断标记；该源码完整 UI 874 文件/7,979 项通过，Vitest 354.69 秒/外层 355.49 秒、exit 0，证据 `/private/tmp/aino-ui-final-continuation-hMD5xI/`。后续清理修复 `3517ccfd3b` 的 2 项行为 RED 后，3 文件/124 项通过（4.58 秒，含真实 profile-rail 集成），三个 TS 配置、scoped lint 0 errors/0 warnings、独立 `delivery_audit` APPROVED，唯一 P2 已关闭；旧核心短信/重启/充值流程没有重复运行。
- 最终开发构建 `3517ccfd3b` / API `a5f720aa8`：renderer Vite 外层 11.142 秒，显式 Electron tsc、main/preload `--dev` 打包、native deps staging、dist 检查均 exit 0，395 文件清单与日志哈希已记录；E2E 夹具提交 `855edc2e1d`。这不是新签名/公证安装包，也没有把旧原生验收移记到本次构建。

UI 与清理修复的精确源码及结果另汇总于[接续验证回执](aino-platform-continuation-validation-20260917.json)。本节覆盖前文“工作区后半段、充值后双端未运行”的历史状态；Python SIGBUS、默认沙箱签名公证包、多平台及真实服务仍未关闭。
