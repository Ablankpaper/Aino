# B4：平台 Agent 运行时本地验收

日期：2026-09-15。范围为 B4；在 Claude 的未提交 provider/runtime 草稿上补齐真实接线。
代码提交：`f46af0c914`。
两仓库保留 `codex/aino-platform-identity-models-billing`。本轮仅修改 Aino，Aino-API 基线仍为
`9de47dab17de239a3735963a7339c254e34878d7`。未推送、合并 main、部署、发送短信、调用付费模型或支付。

## 实现与实际契约

- `session.create {source:"desktop", model_source:"aino", model_id}` 返回 `info.model_status`。
  未绑定为 `awaiting_managed_credentials`，不创建错误 Agent、不请求模型、不落空白会话行。
  `prompt.submit` 此时返回 4410 与安全的 `data.reason`，不排队后自动发送。
- `managed_session.py` 承接平台会话选择、身份校验、运行时和安全元数据；server 只做调用点接线。
  B3 的 ticket → claim → lease → bind 顺序不变。先绑定凭据，首次发送才构建真实 AIAgent。
- `aino` provider 通过真实插件发现注册，目录由平台提供。实际协议复用现有 SDK：
  `chat_completions`、`anthropic_messages`、`responses → codex_responses`；provider 始终是 `aino`。
  本地服务实际收到 `/v1/chat/completions`、`/v1/messages`、`/v1/responses`，没有重复 `/v1`。
- 请求认证使用现有 SDK 支持的 callable Key，每个请求读取同一 live session 的当前有效租约。
  续租不重建 Agent、system prompt、history 或工具列表；注销、断线或到期后 callable 不能继续取旧 Key。
- 增加仅供**当前已授权 controller socket**的 `session.renew_managed_model`。它只延长仍有效、同 revision、
  同 owner、同模型/协议/能力/endpoint 的绑定；不得重新认领、换用户、换模型或复活已失效授权。
  初次绑定、重连和换模型仍必须取得所属聊天 socket 的新 ticket。
- main 约 20 分钟续租；短 TTL 使用剩余时间的 1/3。复用原 `connection_grant_id`。
  无重试循环：网络失败保留旧租约至原期限；明确账户失效立即清理；用户可重新绑定恢复。
- DB 只保存 source、目录 ID、实际模型、协议、平台 origin/用户 ID 等公开标识。
  cold/lazy/deferred/eager 四条恢复路径均保留原费用来源，重新绑定前不请求；其他用户不能给旧会话续费。
- `session.branch` 及带历史的 `session.create` 继承公开平台身份，不复制授权；新分支独立绑定。
  显式选择 BYOK 的分支保留 BYOK。命名 profile 使用其自己的 DB；`/new` 的 Agent 重建仍使用平台绑定。
- 平台模型切换复用 `config.set`：`{session_id,key:"model",value:目录ID,model_source:"aino"}`。
  有历史且未确认时返回原有 `confirm_required/confirm_message`；确认后再传 `confirm_expensive_model:true`。
  仅所属聊天 socket 可操作，活动回合/正在构建时拒绝。成功选择后需 B3 重绑；提交前旧消息仍保留。
  绑定后复用现有 `agent.switch_model` 和切换标记；这是用户主动换模型的既有缓存重建边界，**续租不走此路径**。
- 切回 BYOK 使用原有显式 provider 的会话切换；已建 Agent 和未绑定草稿都清平台授权及元数据。
  B6 同时调用 main `platformModels.clear` 释放对应 socket。平台会话不支持 `/model --once` 跨费用来源。
- 平台 lease 不序列化给 compute-host 子进程；平台会话在持有授权的 gateway 中执行。
  历史崩溃恢复不自动重发可能已有副作用的付费请求，等待用户重绑并明确发送。

## 证据

新增真实链路测试使用临时 HERMES_HOME、SessionDB、真实 RPC dispatcher、provider discovery、
真实 `_make_agent`/AIAgent/SDK、loopback HTTP 与真实 `read_file` 工具。没有 mock Agent builder。
仅隔离与本测试无关的 MCP/通知启动，关闭自动标题（其费用继承由 B5 实现）。

- 先复现缺失 `model_status` 和 `Provider 'aino' ... no API key`；随后补足真实构建入口。
- 再复现分支回到默认 provider、切回 BYOK 后残留授权、平台切换缺少确认入口、未绑定草稿切回 BYOK 仍等待等问题，逐项修复。
- 每种协议实际执行 stream → tool call → 真实文件读取 → tool result → final；续租后录到新 Authorization，
  同时断言 system/history/tools 不因续租改变。检查临时文件未包含测试 Key。
- 12 项真实 Agent 场景涵盖三协议、四种恢复、分支、BYOK、平台切换、取消、命名 profile 与重建。
- provider/runtime/绑定/真实 Agent 组合 25 项通过；B3 真实双 WebSocket 测试包含在网关回归中。
- Electron 平台相关 7 文件、73 项通过，含真实本地 HTTP/WS 序列化、定时续租和 clear 停止续租。
- `npm run typecheck`、`npm run build`、本轮 Python Ruff 与相关 Electron ESLint 通过。
  npm 项目配置及 Vite 配置弃用提示为已有警告，不是编译错误。

日志目录：`/tmp/aino-b4-validation.Sl2M2D/`（临时材料，不提交）。
`gateway.log` 保存首次网关回归：125 文件，1,109 通过、1 失败；失败是新增测试读取未启动线程的竞争，
已改为在生产使用的 sessions lock 下读取句柄。修复后定向命令结果见 `final-managed.log`；
最终 `gateway-final.log`：125 文件、1,111 项通过、0 失败，70.3 秒；不把首次运行描述为全绿。

## 仍由后续阶段完成

1. **B5**：标题、压缩、视觉、并发子任务/子进程的费用来源继承与对账头；平台与渠道 401 的区分及有限恢复。
   本轮关闭了主 Agent 的跨来源 fallback，未宣称所有辅助调用已隔离或正式计费已通过。
2. **B6**：设置、主页、输入框共享模型选择；真实 UI 消费等待/确认/绑定状态、清理 main socket、错误恢复和本地化。
   本轮没有把模型选择 UI 接上，不能宣布“登录 Aino 即可聊”已经交付用户。
3. **C/D**：余额、报价、幂等订单、支付恢复、消费账本、两仓库完整联调、部署和回退材料。
4. 正式服务模型能力/扣费、真实短信/支付、远程 TLS/SSH 真实授权及 Windows/Linux 安全存储仍未验收。
   本地协议替身不代表正式服务已通过，也不自动启用任何生产模型。
