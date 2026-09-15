# B3：可信会话绑定补齐与验收

日期：2026-09-15。代码提交：`3b4d5d9e3f62b7fc5811f70b4724d6c76769bdba`。API 配对：`9de47dab17de239a3735963a7339c254e34878d7`。均位于 `codex/aino-platform-identity-models-billing`；原 Claude 提交保留，未推送、合并或部署。

## 修复与红灯证据

- 真实 PlatformAuth 的 account snapshot 不含 accessToken。原控制器试图从 snapshot 取 token，实测返回 no_access_token，RPC 为零；改为私有 authenticated 模型操作。
- 原客户端请求 /models/lease，B2 实际路由是 /desktop/credentials，且要求 device_id / connection_grant_id。HTTP 路由合同在修复前失败。
- 原 gateway 仅检查 session 存在；不同 transport 可以绑定过期 Key、用旧 revision 覆盖/清理。通过实际 session.create/dispatch 复现，改为拥有会话的 transport 一次性委托给同主体 main socket。
- 原 main resolver 返回 null，发送函数直接 throw；现接原 registry/local/SSH/remote resolver 和共享 JSON-RPC，OAuth 每次 dial 获取新票。
- malformed WS 日志原样打印 payload。实测含测试 Key 的损坏帧导致日志断言失败；现在仅保留长度/错误位置，响应与日志均不回显原文。

## 实际契约

renderer 的 helper：`src/api/platform-models.ts`。公开 owner → 所属 chat socket 的 ticket → main 的 claim → 主进程 HTTP lease → main bind；claim 返回 `managed_model_binding:1` 与 gateway revision 后才获取 Key。票 60 秒单次消费。

内存按 live session 对象、transport、profile/source、平台 owner、模型绑定。新 ticket 暂不删除旧有效 lease，成功替换时才取消旧 timer。旧 revision 不清除新绑定；运行中只允许同模型/同 owner 续租；到期/session pop/transport disconnect 删除凭据，必要时取消活动回合。没有修改模型提示词、历史、工具列表、BYOK 配置。

main 对窗口/账户 generation/连接配置/OAuth 主体做异步复核；scope 包含 connection/profile/session。远程授权绑定当前连接，只有 WSS 或既有 SSH 隧道可传 Key，默认取消；同一可信 socket 续租复用 grant，新连接重新确认。原生字典包含 en/ja/zh/zh-hant/ar。

## 验证结果

工作目录按命令分类：Python 在 Aino 根目录；npm 在 apps/desktop；共享 RPC 的独立命令在根目录。

| 范围 / 命令 | 结果 |
| --- | --- |
| `scripts/run_tests.sh -j 3 --file-timeout 60 --file-retries 0 tests/tui_gateway/` | 122 文件，1,090 项通过，0 失败，63.9 秒 |
| Electron：platform-*、connection config/apply/registry/window routes、WS probe、native OAuth/login、OAuth partition/net、SSH connection/config | 19 文件，440 项通过 |
| `npm run test:ui -- src/api/platform-models.test.ts src/store/account.test.ts src/app/account` | 4 文件，16 项通过 |
| UI 共享 RPC heartbeat/recovery/url guard | 3 文件，10 项通过 |
| `npx vitest run --config tests-js/vitest.config.ts apps/shared/src/json-rpc-gateway-errors.test.ts apps/shared/src/json-rpc-gateway-replay.test.ts` | 2 文件，9 项通过 |
| `npm run typecheck` | renderer、Electron、e2e 三套 TypeScript 检查通过 |
| `npm run build` | renderer + main/preload + native staging + dist 检查通过 |
| 最后 OAuth 主体修正后的 binding target/runtime/native OAuth/login 定向复验 | 4 文件，38 项通过；Electron typecheck/main bundle 通过 |
| 最后日志修正后的 managed WS/keepalive/surrogate 定向复验 | 3 文件，7 项通过 |
| 相关 ESLint、Python Ruff、git diff --check | 通过 |

TS 集成使用真实 createPlatformAuth、平台 client、JSON-RPC client、本地 HTTP 和真实 WS 序列化，平台服务为受控 B1/B2 HTTP fixture。Python 集成启动真实 uvicorn + loopback WS，用两条受保护 transport 调用真实 session/gateway handler，验证关闭与临时文件/日志没有测试 Key。没有调用付费模型。

早期 ASGI TestClient 关闭测试有一次等待超过一分钟，已主动终止；诊断运行设 20 秒文件上限，最终改为真实 loopback socket、事件同步和 5 秒收发/退出等待，外层 25 秒上限、零自动重试。修复后定向与完整 gateway 回归通过，不隐藏原问题。

已有 Vite/native-loader 提醒、大 chunk、npm min-release-age 配置提醒以及 uvicorn 旧 WS 协议的依赖弃用警告不影响本轮通过；未通过升级依赖消除它们。

## 不能由本轮结果推导的结论

- B4 的无 BYOK 草稿、provider、真实 Agent 工具流式、客户端续租与重启恢复尚未实现。B3 ready 仅表示绑定成功。
- B5 辅助费用继承、B6 模型 UI、C 钱包支付和 D 跨仓库完整闭环仍待完成。
- 本地 fixture 不等于生产模型、实际扣费、阿里云短信、正式人机验证、真实支付或 Windows/Linux 安全存储已验收。
- 新原生远程确认界面未人工点验；真实远程 WSS/SSH/OAuth 服务组合仍需 D 验证。
- 没有重新跑全仓所有 JS/Go/Python 测试；已记录的历史 CI/夹具问题仍在交接清单。
- 当前 Go B2 固定正式 inference base_url。后续隔离闭环须配置同一开发 origin 的本地推理入口，不放宽生产白名单、不将测试凭据传向生产。

下一执行入口：[Claude B4 接续清单](aino-platform-claude-handoff.md)。
