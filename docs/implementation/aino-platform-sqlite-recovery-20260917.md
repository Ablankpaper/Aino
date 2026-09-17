# SQLite 启动竞态与测试 guard 修复交付记录

日期：2026-09-17。本文归档本地诊断、修复和验证事实；不包含凭据、账号信息或个人目录。原始日志保留在文末列出的本机临时路径，未随本文提交，可能被系统清理；SHA256 用于核对尚存原件。

## 交付结论

- SQLite 修复：`9cb574c2dd2cac4ce461189cb0264da908e38bb3`，`fix(sqlite): preserve live database identity during startup`，共 7 个生产文件、3 个测试文件。
- 测试 guard 修复：`0eca169be63e5304c1b4f74d87682019a612dcc7`，`test: preserve ESRCH when signal ancestry races child exit`，只改 2 个测试文件。
- 已捕获真实 SQLite 将仍有映射的 SHM inode 从 32768 字节缩至 3 字节，以及同时存在的主库 inode 替换竞态；已用行为回归验证修复。没有在诊断期间自然重现 SIGBUS，也无法追溯确认历史 SIGBUS 的 fault inode。
- SQLite 修复后的较广回归为 **1615 文件、18593 passed、1 failed、209 skipped，exit 1**，未再次出现 SIGBUS。唯一失败位于 LSP 测试 shutdown 的进程 guard 路径。guard 修复后定向结果为 **4 文件、41 passed，exit 0**。未在 guard 修复后重跑较广范围，不能将两份回执合并描述为整套全绿。

## 历史故障与因果证据

历史运行原件为 `/tmp/aino-d2-python-final-82e0ba3.log`：1612 文件、30 workers、315.1 秒，`tests/hermes_cli/test_mcp_catalog_env_boundary.py` 收集 10 项、输出 8 个通过进度点后发生 SIGBUS。对应 macOS crash report 的时间为 2026-09-16 19:09:22；实际进程为 arm64 Python 3.11.15，SQLite 3.53.1，Python 可执行文件 UUID 与报告一致。

原生栈包含 `pagerWalFrames → sqlite3_step → pysqlite_cursor_executescript`；内核记录文件 page-in error 22、越过 EOF，相关文件映射为 32 KiB。历史报告没有给出该映射的文件名，故不能指定原故障 inode。仅凭 eager 线程与 fixture teardown 重叠也不能建立根因；早期带 barrier 的观察没有崩溃，且相关 fixture 文件仍存在。

诊断采用本机无提权的 `proc_pidinfo(PROC_PIDREGIONPATHINFO)`、`vmmap`、`sample`，并验证只在真实 SIGBUS 时记录 fault address、PC/SP、暂停目标并由观察器抓取 vnode 与原生栈。独立 C 阳性对照通过截断它自己创建的文件触发 SIGBUS，证明捕获链可用；这不是 Hermes 故障复现，也没有截断 Hermes 数据库。

首轮有效单文件观察通过 10 项，没有 SIGBUS。第二轮针对原失败文件与三个邻近文件，以官方 runner 在临时 `HERMES_HOME` 下运行：

```sh
HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh \
  tests/hermes_cli/test_mcp_catalog_env_boundary.py \
  tests/hermes_cli/test_mcp_dashboard_oauth.py \
  tests/hermes_cli/test_local_models_routes.py \
  tests/hermes_cli/test_local_server_lifecycle.py \
  -j 4 --file-timeout 120 -q -o 'addopts=-p aino_bus_diag_20260917'
```

这里的诊断插件是本地临时仪器，已移除；该命令记录原执行方式，不是仓库当前可直接运行的常设测试。4-worker 是有界近似压力，不等同于原始 30-worker 运行。

VFS 仪器先校验实际 Python 内置 SQLite，再包装其 `ftruncate/mmap/munmap/unlink`，保留参数、返回值及 errno，记录本进程临时目录内 FD、inode、文件大小、线程及原生栈。初次符号解析命中的系统 SQLite 3.51.0 被校验拒绝，实际捕获来自业务使用的 3.53.1；不能解释为两版 SQLite 同时写库。实际 Python 二进制 SHA256 为 `612bb6e55a95ea6eaf3c9693cf17fbf1a738408ad3bbfce988f712d7321d2c42`。第二轮使用同一原生单调时钟、校验查询地址所属区域、区分 fork PID，并保留观察器至解释器退出。

第二轮四文件 **32 passed，exit 0，3.2 秒**。目标 PID 57002 的 VFS 记录有 219 行、120 次调用：unlink 42、ftruncate 36、mmap 21、munmap 21。它给出以下直接证据：

1. 7 个测试 HOME 中，已有连接持有的旧主库被改名为 `.zeroed-*.bak`，原路径出现新主库 inode。
2. SQLite 的 `unixLockSharedMemory → unixShmMap → walIndexPageRealloc` 路径实际执行了 7 次 SHM 从 32768 字节缩至 3 字节。
3. 其中 3 次缩短时，同一 inode 已有成功的 32 KiB mmap，且中间没有成功 munmap；这些 inode 为 `239238307`、`239238424`、`239238465`。
4. 示例 SHM inode `239238465` 先被线程 `5682791` 映射到 `0x104018000`；线程 `5682790` 随后沿 executescript 路径缩短该 inode，再映射到 `0x104040000`；第一次映射之后才释放。对应旧主库 inode `239238450` 被替换为 `239238459`。

由此确定的缺陷是：hosted 路径通过未登记的原始 `sqlite3.connect` 首次创建空库；eager `SessionDB` 看不到活连接，零库恢复将仍被使用的主库改名。同一进程中的旧、新主库 inode 因而共用原 SHM 路径，而进程级 POSIX 锁不能隔离这两代主库。SQLite 自身成为缩短 SHM 的执行者。这个危险操作链已被实际捕获；历史崩溃的具体映射身份仍不可追溯确认。

仪器未注入数据库截断、barrier 或 WAL 模式变更，但会影响调度。包装调用累计计时约 1.997 ms，不含观察器及其它插桩开销，不能当作总诊断开销。

## SQLite 修复与回归

修复复用既有连接追踪、`.quarantine.lock` 和 `offline_file_access()`，没有新增管理器或对正常非空库施加统一启动串行锁：

- `gateway/hosted_rooms_common.py`、`gateway/hosted_room_policy_checkpoint.py`、`gateway/delivery_ledger.py`、`tools/async_delegation.py`：首次创建者登记真实连接，仅缺失或零字节库在既有隔离锁内完成 schema 初始化和提交；失败显式关闭连接。
- `gateway/hosted_rooms.py`：探测连接加入追踪；schema 读取失败时显式关闭，避免追踪计数残留阻止后续恢复。
- `gateway/hosted_room_policy_checkpoint.py`：连接上下文实际 close，而不只依赖 SQLite 上下文的提交/回滚语义。
- `gateway/lifecycle_ledger.py`：使用 tracked `mode=rw`，避免路径检查后消失时意外新建空库。
- `hermes_state_dbfile.py`：在已有跨进程隔离锁内，以同一个 `offline_file_access()` 区间覆盖最终零库检查、主库和全部 sidecar 改名，关闭检查与重命名间的新连接窗口。无活连接的真实零库仍保留原备份恢复能力。

新增生命周期测试最终为 2 个函数、6 个参数项，使用真实 SQLite、实际模块和临时 `HERMES_HOME`，验证活主库 inode 保持、多种 schema 共存、隔离与新连接互斥、原备份字节保留、坏库读取失败后同进程仍可恢复。两个既有 FD 泄漏测试的 double 改为继承生产请求的 connection factory，保留真实关闭与追踪注销。

| 回执 | 实际结果 | 含义 |
| --- | --- | --- |
| `regression-two-red.log` | 2 failed | 修复前，活连接主库替换及检查/重命名窗口合同均失败 |
| `regression-green.log` | 2 passed | 初版对应合同通过 |
| `focused-green.log` | 13 文件，204 passed / 3 failed / 1 skipped | 文件名虽含 green，实际失败；3 项暴露旧 FD double 不保留 factory |
| `affected-tests-final-green.log` | 3 文件，8 passed | 调整 double 与 creator 参数后的独立回执 |
| `failed-read-red.log` | 1 failed / 5 deselected | 独立审查发现的异常读取 tracking 泄漏，先证实失败 |
| `failed-read-final-green.log` | 3 文件，51 passed，exit 0 | 异常 close 补丁后，生命周期、hosted read-path 与 rooms 通过 |

独立 SQLite spec/quality 审查最终无未解决 finding。审查发现的异常读取问题已通过上述 RED/GREEN 关闭。新增并发合同主要证明进程内行为；四类 creator 的跨进程启动锁本次进行了锁协议代码审查，没有新增独立跨进程运行证明。相关 `ruff check` 与 diff 空白检查通过。

SQLite 主修复后，以相同第二版仪器单独重跑原失败文件：PID 65622，**10 passed，exit 0**，runner 四舍五入总耗时 1.7 秒，文件子进程耗时 1.66 秒。VFS 共 137 次调用：unlink 54、ftruncate 37、mmap 23、munmap 23；**0 次 SHM 缩短、0 次 zeroed 改名**，sessionfinish 时 eager 线程仍在。包装累计计时约 2.204 ms，同样不代表总开销。

这次后置 VFS 观察早于最后的 schema 异常 close 补丁；后者由独立失败读取 RED 和 51 项 GREEN 验证，未再次执行 VFS。前后两轮都没有自然 SIGBUS，不能将“未崩溃”单独作为故障完全消失的证明。

## 较广回归与 guard 定向关闭

较广运行由官方 runner 执行，30 workers，关闭文件重试，每文件超时 300 秒：

```sh
scripts/run_tests.sh \
  tests/tui_gateway/ tests/agent/ tests/plugins/ tests/hermes_cli/ \
  tests/run_agent/test_provider_fallback.py \
  tests/gateway/test_hosted_rooms_state_db_lifecycle.py \
  tests/gateway/test_delivery_ledger_fd_leak.py \
  tests/tools/test_async_delegation_fd_leak.py \
  -j 30 --file-timeout 300 --file-retries 0
```

原件保存在 `/private/tmp/aino-python-current-EaGFFe/`。其 `source.json` 和 `exit.json` 记录基线 `9610d77eed742336683edcfd63cdf1bbd264be44`；运行时应用了该目录 `working-python.diff` 中的未提交 SQLite 修复。本文整理时逐一核对，`source.json` 的 10 个文件 SHA256 全部与后续 SQLite 提交 `9cb574c2dd` 对应文件一致。这是源码关联核验，不将原运行重新标记为在后续提交上执行。

`tests.log` 最终为 **1615 文件、18593 passed、1 failed、209 skipped、333.9 秒**。`exit.json` 为 exit 1、signal null、未超时、335636 ms。没有 SIGBUS，原 SIGBUS 文件通过。唯一失败是 `tests/agent/lsp/test_client_e2e.py::test_client_receives_published_errors` 的 finally/shutdown，诊断内容断言本身不是失败点。

失败链为 `LSPClient.shutdown → _cleanup_process → asyncio.Process.terminate → Popen.send_signal → tests/conftest.py` 的信号 guard，目标 PID 68322 / SIGTERM。已确认 guard 缺陷：若 `psutil.Process(pid)` 成功而父链遍历时子进程恰已被回收，`NoSuchProcess` 会被转为非子树判断，最终抛出 `RuntimeError`，遮蔽 LSP 与 CPython 已处理的 `ProcessLookupError`。历史日志没有记录当时完整父链或 psutil 异常，因此不能追溯断言原 PID 必定处于这个窗口，也不能把原失败称为环境 flake。

guard 提交只在 POSIX 正 PID 的原拒绝分支调用捕获的 `real_kill(pid, 0)`：内核 ESRCH 原样传播；活 PID 和 `PermissionError` 仍按原逻辑拒绝。未改变 LSP 生产代码、负 PID 或 Windows 路径，也没有将原非零信号转发到该拒绝路径。

新增 guard 测试为 2 个函数、3 项本机 macOS 用例，使用真实 spawn/wait 回收的自有子进程，只模拟 Process 成功后父链观察失效的窗口。foreign PID 测试用 spy 在任何非零信号到达底层前失败，仅允许 signal 0 探测。没有伪造 host OS，也没有本次 Linux 专门运行回执。基线中 Process 构造异常时的既有 blanket-except 分支未在本次修改，结论限于保留原拒绝路径的边界。

```sh
HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh \
  tests/test_live_system_guard_exit_race.py -j 1 --file-timeout 60 -q
HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh \
  tests/test_live_system_guard_exit_race.py tests/test_live_system_guard.py \
  tests/test_live_system_guard_self_test.py tests/agent/lsp/test_client_e2e.py \
  -j 2 --file-timeout 120 -q
```

原 guard 的 RED 为 **3 failed，exit 1**；修复后的 GREEN 为 **4 文件、41 passed、exit 0、1.2 秒**，包含新增 3 项、argv guard 4 项、guard self-test 29 项、原 LSP 文件 5 项。独立 applied-diff 审查结论 APPROVED，无阻塞项；该结论来自当时审查消息及本地工作报告，没有单独持久化的 guard 审查文件。两文件 `ruff check` 和 diff 空白检查通过。

## 原件索引与 SHA256

以下哈希于 2026-09-17 从尚存原件重新计算。路径只指向本机诊断产物；正文没有复制原件中的个人目录、环境或凭据。crash report 路径用 `$HOME` 代替个人目录。两个分析 JSON 是从各轮原始 trace 生成的派生证据，应与同目录 TSV 一起核对。

```text
bfdaafd1b43a6617346981c7e4b2bdcbe9847f7bfad48e6504513239fc4aa619  /tmp/aino-d2-python-final-82e0ba3.log
b433379ef65a95cb123754d719431d8e56ccce8be56933485759ccb891216184  $HOME/Library/Logs/DiagnosticReports/python-2026-09-16-190922.ips
6e7d57653a96964cc745766e41ad585c68ee3a3d90a8c6356c69da1958fba723  /tmp/aino-sigbus-20260917/parallel-run.log
c493546d23467c7fd8d41dd2884acd425c9e152114c9b798c6965ec5b2ab6860  /tmp/aino-sigbus-20260917/parallel-57002/observer.tsv
061e4f792f694fde1780eeeb0b476a310886d09fab1fd8e15eb8e2062352d1da  /tmp/aino-sigbus-20260917/parallel-57002/sqlite-syscalls.tsv
51a3d8052c66033fdd6a03310a88358e2de3d69d606e4da179ae0692e4b159d6  /tmp/aino-sigbus-20260917/parallel-57002/analysis.json
2106b66755ce3e68edb8c889cb7b4c275f68d3bcaaaf00e7174dd91f50f32e40  /tmp/aino-sigbus-20260917/parallel-57002/sqlite-syscalls-symbolized.json
d563166fc9beed35360cc4d039e732c58e44ce6f7d7b18e1fa0e4336918202d5  /tmp/aino-sigbus-20260917/regression-two-red.log
4ff67d6a744599f8da96e37072c961289d6da0bde46bf4d680754f8d68789137  /tmp/aino-sigbus-20260917/regression-green.log
2963e9fa1cf45ca520379d1b283bd88badd0e32980d0f11bf36b7d3694ab531a  /tmp/aino-sigbus-20260917/focused-green.log
82522e47ea5857280d17d77f7c5fafd47868166fdc36ae96dda6af761ece8711  /tmp/aino-sigbus-20260917/affected-tests-final-green.log
4b825454da8f59f52ffaddc7bb780eb21f0267d0c960d7fce0700e5abd171c4c  /tmp/aino-sigbus-20260917/failed-read-red.log
78a5394100022aaa88a7024be36265ab718ebe29eb4f58e5150adaf87b079e1f  /tmp/aino-sigbus-20260917/failed-read-final-green.log
d0e1f35b5d47c53c47e82a2b7f07c882b9750b5a5f659cf3e30ef50df4f2b008  /tmp/aino-sigbus-20260917/post-fix-observation.log
2ce9578dcd189d9ec2df45fdd5478e04ffd2db9972314030dbef03317fc207f3  /tmp/aino-sigbus-20260917/parallel-65622/observer.tsv
1b3f5bcec99c6330b783a630feb92804bc790679d0c2d338daea1be5948d168f  /tmp/aino-sigbus-20260917/parallel-65622/sqlite-syscalls.tsv
549faefd46240fcf941fc0fd934cb2bd03b84d5e0fed5517485670f71cefa9e0  /tmp/aino-sigbus-20260917/parallel-65622/analysis.json
a1347ed7cf1977443ff541061180c539418364d4bd383c1154f212c71db0e7ae  /private/tmp/aino-python-current-EaGFFe/tests.log
e4e007d74fae73940df957cfb789671eec2dfeeccbc71c826e3e0d3f0f42bdc4  /private/tmp/aino-python-current-EaGFFe/exit.json
a4c1ef08a353800f09f394503169ffb6beacd351513b011738987d3beab25b92  /private/tmp/aino-python-current-EaGFFe/source.json
ed68509a2b680e8816732a7ed88bb5eaf106dd2a7f335d584f1cc46f92db26f4  /private/tmp/aino-python-current-EaGFFe/working-python.diff
d8af94adcbba9563a95b2b6b11a65fa906bc758af5ee69c643f4615db603f5db  /tmp/aino-lsp-guard-20260917/red.log
67f98fb55e77ff53f5c207d96aaf3da06bb6fc7e82ccbb0b8ce2c07c12baf181  /tmp/aino-lsp-guard-20260917/green.log
```

本次归档仅新增本文；未改生产代码、运行新测试或提交 git commit。以上运行结果均来自所列既有回执，未访问个人 HOME 凭据、真实模型服务或改变系统安全设置。
