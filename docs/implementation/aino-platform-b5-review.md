# B5 辅助调用与消费关联验收

日期：2026-09-16。执行与复核：Codex 当前会话串行进行，没有独立子智能体复核。
基线：Aino `fc59487f1b`；Aino-API `9de47dab17de239a3735963a7339c254e34878d7`。
本文件随 B5 实现提交。API 本轮无修改；仅本地开发，没有推送、合并或线上调用。

## 实现边界

- `ManagedCredential` 引用会话内存授权，不保存密钥副本。HTTP hook 在实际发送时重新取 Key，校验模型与目的地址；每个实际请求独立生成 call UUID。
- `BillingScope` 只作为运行时/HTTP 元数据，包含账户、会话、回合与用途。标题后台线程复制 context；子任务沿原线程传播机制继承授权，辅助客户端缓存按回合作用域隔离。
- 三协议的标题、压缩、视觉继承主模型；未知视觉能力拒绝调用。显式 BYOK auxiliary 使用独立路由并显示四语言费用来源提示；没有自定义配置时不再静默发现其他 API-key 服务商。
- 平台调用不能启用 BYOK fallback、共享凭据池或压缩停滞时的跨提供商替换；BYOK 会话不使用其他登录账户的平台租约。
- 默认及具名工作区均通过会话所属 DB 解析 compression lineage；续接/恢复保持 billing session UUID，分支生成不同关联 ID。
- `message.complete.turn_metrics.billing` 包含 source/session_id/turn_id，状态仅为 `pending`。C2 仍需保存实际 call IDs、接入原账本和结算状态，当前不显示假费用或假 0。
- 本方过期/撤销与上游 401 分开；按 API 实际顶层 `code` 识别余额、订阅与额度错误。沿用 B4 主进程主动续租，错误后不自动重放模型回合或工具副作用；B6/C4 负责恢复入口。
- 定时任务拒绝持久化短时平台授权；显式 BYOK/no-agent 原功能保留。远端 compute-host 不支持序列化平台租约。

## 红灯与修复证据

首次 B5 用例覆盖关联头、辅助继承与线程作用域的缺失；补验实际 API 错误响应后，余额/无订阅被误分类为鉴权失败、额度耗尽被误分类为 rate limit，共 3 项红灯，补齐错误码映射后通过。

压缩恢复测试先关闭再标记 compression，违反数据库“首个 end_reason 保留”的契约，修正测试建模顺序后默认工作区通过。新增具名工作区仍复现 UUID 变化，根因为读取了启动 DB；改为原 `_session_db` 所属工作区解析后，两种工作区均通过。未修改数据库结束原因规则。

未配置 custom auxiliary 但环境中存在其他服务商测试 Key 时，真实 resolver 返回该服务商客户端；将托管上下文的 custom discovery 限定在原 custom endpoint 后，拒绝跨费用来源。测试只解析客户端，没有向外部请求。

## 验证

所有 Python 测试使用项目 runner、隔离 HERMES_HOME、真实 Agent/SDK/SessionDB 和 loopback HTTP。

```sh
scripts/run_tests.sh -j 3 --file-timeout 60 --file-retries 0 tests/agent/test_managed_billing_scope.py tests/tui_gateway/test_managed_usage_correlation.py tests/tui_gateway/test_managed_model_agent.py tests/tools/test_managed_delegation_billing.py tests/cron/test_managed_cron_authority.py --tb=short --show-capture=no
# 5 文件，49 项通过，22.4 秒。

scripts/run_tests.sh -j 3 --file-timeout 60 --file-retries 0 tests/tui_gateway/ tests/agent/test_auxiliary_client.py tests/agent/test_auxiliary_client_anthropic_custom.py tests/agent/test_title_generator.py tests/agent/test_managed_billing_scope.py tests/tools/test_managed_delegation_billing.py tests/cron/test_managed_cron_authority.py --tb=short --show-capture=no
# 131 文件，1,388 项通过，79.2 秒。

# apps/desktop
npm run test:ui -- src/store/agent-notices.test.ts
# 21 项通过。
npm run typecheck
# 通过。
```

相关 Python Ruff、桌面 ESLint（max-warnings=0）、`git diff --check` 通过。桌面 `npm run build` 在本轮前段通过；其后仅修改 Python 和文档，renderer 代码未再变。npm 配置/Vite 弃用警告仍存在，不计为错误。

## 未通过与未验证

较大 Python 回归（agent、gateway、cron 和 delegation）：750 文件，8,976 项通过、4 项失败、29 项跳过，443.6 秒；另 1 文件达 60 秒预算。不是全绿。

- `test_managed_usage_correlation`：本次关联问题，已修复并完成上述最终复验。
- `test_codex_aux_timeout_fd_ownership`：已在 B4 前基线出现的 timer/owner 先后顺序问题。
- `test_codex_ttfb_watchdog`：60 秒文件预算超时；没有反复原样重跑，D 阶段核对测试预期时长/线程退出。
- `test_file_permissions::test_ensure_hermes_home_sets_0700`：期望 0700，得到 0755；相关配置实现未改，D 阶段分离夹具与实际权限行为。
- `test_delegate::test_child_dedicated_db_follows_parents_db_path`：macOS `/tmp` 与 `/private/tmp` 路径比较；本次未改 DB 路径逻辑，D 阶段确认规范化语义。

日志：`/tmp/aino-b5-regression.log`、`/tmp/aino-b5-focused-green.log`、`/tmp/aino-b5-final-regression.log`。临时日志不提交，关键结果保留在本文。

没有新增布局，本轮未运行原生截图/浏览器视觉测试；没有重跑完整 Electron/UI 套件或 Go 测试。真实平台账本、正式模型、短信、支付、Windows/Linux 与远程安全存储均未验收，不能宣布“登录即聊”或充值已交付。下一阶段为 B6。
