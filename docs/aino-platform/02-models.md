# B：内置模型与运行时 Implementation Plan

> 进度说明：以下复选框保留原始任务拆解，不表示当前实施待办；实际已完成阶段、对应提交和验收边界统一以 [阶段进度](../implementation/aino-platform-progress.md) 与 [验收矩阵](../implementation/aino-platform-acceptance-matrix.md) 为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户登录后无须配置 Key 即可使用内置模型，真实 Agent 工具/流式/压缩均保留，BYOK 不被覆盖。

**Architecture:** 服务端整理授权模型目录，签发归属用户的托管 APIKey 租约；Electron 用既有受保护 JSON-RPC 向目标 Agent 会话绑定内存凭据。模型调用继续使用 Aino-API 原 gateway 与账本。

**Tech Stack:** Go/Gin/Ent、已有 APIKey/分组服务；Electron、共享 JSON-RPC；Python ProviderProfile/AIAgent；React/nanostores。

**Spec:** [完整设计第 5.2、6、7 节](/Users/zizimutou/Protect/Aino/docs/aino-platform/design.md)。

## Global Constraints

- 遵守[总计划](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)；A 阶段的真实身份/令牌生命周期先通过。
- 平台 Key 只能推理，不是用户 JWT；不能使用管理员/共享 Key，不在 renderer 或用户配置落盘。
- `desktop_api_version=1`；平台目录是用户权限与已验证模型能力的交集，不是模型广场全量列表。
- 托管租约默认 60 分钟，活动平台会话约 20 分钟续租；必须受父认证会话撤销约束。
- 不改变提示词/历史/工具来续租；不默默更换费用来源、用户或模型。
- 自定义模型保留全部原有行为；平台不可用不会反向破坏 BYOK。

命令工作目录：`go`/`make generate` 在 `/Users/zizimutou/Protect/Aino-API/backend`；`pnpm` 在其 `frontend`；`scripts/run_tests.sh` 在 `/Users/zizimutou/Protect/Aino`；`npm` 在 `/Users/zizimutou/Protect/Aino/apps/desktop`。所有 `/desktop/*` 简写路由均以 `/api/v1` 为前缀。

## B1：官方模型目录与 bootstrap

**Files（Aino-API）:**

- Create: `backend/internal/service/desktop_models.go`、`desktop_models_test.go`、`setting_desktop.go`。
- Create: `backend/internal/handler/desktop_handler.go`、`backend/internal/server/routes/desktop.go`。
- Modify: `backend/internal/server/router.go`、handler/service Wire wiring、public settings。
- Reuse: `available_channel_handler.go` 背后的 channel/group/pricing service，`api_key_service.go` 用户组权限，`server/middleware/group_model_allowlist.go`，`model_plaza_handler.go` 仅作展示参考。
- UI: 在 A4 的 admin settings 现有配置页新增 `frontend/src/components/admin/settings/DesktopModelsSection.vue`；使用当前已有模型/分组选择控件。
- Test: `backend/internal/handler/desktop_models_handler_test.go`、`backend/internal/service/desktop_models_test.go`。

**Interfaces:**

```go
type DesktopBootstrap struct {
    APIVersion int `json:"api_version"`
    DefaultModelID *string `json:"default_model_id"`
    ModelsEnabled bool `json:"models_enabled"`
    WalletCurrency string `json:"wallet_currency"`
}
func (s *DesktopModelService) ListForUser(ctx context.Context, userID int64) ([]PlatformModel, error)
func (s *DesktopModelService) ResolveForUser(ctx context.Context, userID int64, modelID string) (*ResolvedPlatformModel, error)
```

`PlatformModel` Go DTO 对齐 spec 的 TypeScript 字段；`ResolvedPlatformModel` 是服务端内部类型，含确定 GroupID、实际 ModelID、API 模式、计价引用、允许调用状态；不能把上游凭据放入公共 DTO。

- [ ] **Step 1：先写权限合同。** `desktopModelFixture` 注入真实 group/channel/pricing 服务的临时 DB；提供 `GrantGroup(user, group)` 与 `AddCatalogEntry(model, group)`，不返回预生成目录。

```go
func TestDesktopCatalogNeverWidensUserEntitlements(t *testing.T) {
    f := desktopModelFixture(t)
    f.AddCatalogEntry("fixture-a", 11)
    f.AddCatalogEntry("fixture-b", 22)
    f.GrantGroup(17, 11)
    models, err := f.Service.ListForUser(context.Background(), 17)
    require.NoError(t, err)
    for _, model := range models {
        resolved, err := f.Service.ResolveForUser(context.Background(), 17, model.ID)
        require.NoError(t, err)
        require.True(t, f.UserCanUseGroup(17, resolved.GroupID))
    }
    _, err = f.Service.ResolveForUser(context.Background(), 17, "fixture-b")
    require.Error(t, err)
}
```

- [ ] **Step 2：红灯。** `go test ./internal/service ./internal/handler -run DesktopCatalog`。
- [ ] **Step 3：实现只读聚合。** `GET /desktop/bootstrap` 不创建 Key、不打模型请求。`GET /desktop/models` 从管理员公开列表＋服务端权限＋分组 allowlist 整理；认证与 BackendModeUserGuard、PanelRateLimiter 共用现有模式。列表默认空，不放测试模型到生产。
- [ ] **Step 4：实现后台可配置入口。** 设置项：`desktop.enabled`、`desktop.models`、`desktop.default_model_id`、`desktop.credential_ttl_seconds`。每条目录配置包含稳定 ID、现有分组、实际模型 ID、显示名、排序、协议、经验证能力；价格永远来源于已有 price/rate，不允许填写一份不同价表。默认模型必须可见且有相应能力；移除模型不自动改已有会话。
- [ ] **Step 5：验收响应与兼容。** 无默认模型返回 null；组被删除/不可访问返回清晰禁用原因；报价阶梯/用户倍率正确；公开广场关闭不影响内部正确目录服务；settings 页面不会泄露上游账号名/Key。未知 capabilities 不能默认全 true。
- [ ] **Step 6：测试/提交。** `go test ./internal/service ./internal/handler ./internal/server/routes`；站点相应 Vitest/typecheck；建议 `feat(platform): expose authorized desktop model catalog`。

## B2：用户专属推理凭据与撤销

**Files（Aino-API）:**

- Create: `backend/ent/schema/desktop_model_credential.go`、新 forward migration `240_desktop_model_credentials.sql`（冲突则顺延）。
- Create: `backend/internal/service/desktop_credentials.go`、`backend/internal/repository/desktop_credential_repo.go` 及测试。
- Extend: `desktop_handler.go`、`routes/desktop.go`；复用 `api_key_service.go` 创建/过期/撤销及既有 auth cache invalidation outbox。
- Modify narrowly: `auth_service.go` 的 session family / password / logout 撤销入口及 APIKey 鉴权数据载入；大函数先抽出相应通用收尾小模块再加新行为。
- Test: `desktop_credentials_integration_test.go`、`backend/internal/server/middleware/desktop_credential_auth_test.go`。

**Interfaces:**

```go
type DesktopCredentialRequest struct {
    DeviceID string `json:"device_id"`
    ConnectionGrantID string `json:"connection_grant_id"`
    ModelID string `json:"model_id"`
}
type DesktopCredentialResponse struct {
    CredentialID string `json:"credential_id"`
    APIKey string `json:"api_key"`
    BaseURL string `json:"base_url"`
    ExpiresAt time.Time `json:"expires_at"`
    Model PlatformModel `json:"model"`
}
```

该 response 只能被 Electron main 接收，不通过 UI bridge；服务端响应 `Cache-Control: no-store`。数据库关联包含 `user_id/device_id/connection_grant_id/session_family_id/token_version/group_id/api_key_id/expires_at/revoked_at`，外键与活动唯一性约束一并测试。

- [ ] **Step 1：真实并发/父会话撤销测试。** 复用 B1 目录和 A3 JWT fixture，`newDesktopCredentialRig(t)` 必须通过 HTTP 签发和实际 APIKeyAuth，不直接 mock 鉴权返回 true。

```go
func TestDesktopLeaseCannotOutliveRevokedParentSession(t *testing.T) {
    f := newDesktopCredentialRig(t)
    lease := f.IssueLease("fixture-a")
    require.Equal(t, http.StatusOK, f.GetModelsWithKey(lease.APIKey).StatusCode)
    f.LogoutParentSession()
    require.Equal(t, http.StatusUnauthorized, f.GetModelsWithKey(lease.APIKey).StatusCode)
    require.True(t, f.OrdinaryWebsiteKeyStillWorks())
}
```

- [ ] **Step 2：红灯。** `go test -tags=integration ./internal/service ./internal/server/middleware -run DesktopLease`。
- [ ] **Step 3：实现 create/reuse/renew。** 从 auth context 决定用户与 family，客户端不能选 user/group/quota/无限过期；经 B1 ResolveForUser 取组；为 Aino 专用组创建托管 APIKey，并设置到期。相同作用域并发请求返回同一活动记录，不从 display name 猜是不是托管 Key。不同连接授权/父会话隔离。
- [ ] **Step 4：完善撤销和权限。** 登出当前 session family、revoke-all、改密码、用户禁用、设备撤销让托管 Key 失效并清相关缓存，reuse/renew 不能复活已撤销记录。设备撤销同时撤销关联登录session families；如果JWT尚在有效期，credentials接口也必须检查已撤销父会话，不能由同一旧JWT立刻换connection_grant_id重新签发，必须重新登录。既有网站 `/keys` 通用更新不能把托管 Key 改成永不过期、换组或去掉托管属性；托管项可显示/撤销，不提供绕过租约的编辑。scope 字段由服务器保管。
- [ ] **Step 5：防止响应秘密二次落盘。** 不让通用幂等 response cache 把完整 APIKey 再存一份明文；凭据复用从已有 APIKey record 读取，普通日志/审计只记 ID。Key 只能走现有推理接口，不能调用账户/支付/管理员接口。
- [ ] **Step 6：验收/提交。** 并发唯一、跨用户/device越权、Key已到期、撤销即时失效、缓存失效、权限组变化、普通Key未受影响、session family有期限。`make generate`＋Go/unit/integration。建议 `feat(platform): add revocable device inference leases`。

## B3：主进程到目标会话的可信绑定

2026-09-15：本地实现已由 Codex 补齐并提交 `3b4d5d9e3f`。实际契约增加所属聊天 socket 的一次性 ticket/claim 步骤，详见 [B3 记录](../implementation/aino-platform-b3-review.md) 与 [交接文档](../implementation/aino-platform-claude-handoff.md)。下方最初的接口草图以这些补充和 `shared/platform-contract.ts` 为准。远程真实联调和正式收费仍由 D 验收。

**Files（Aino）:**

- Create: `apps/desktop/electron/platform-runtime-binding.ts`、`platform-runtime-binding.test.ts`。
- Extend: `shared/platform-contract.ts`、`electron/platform-client.ts`、`platform-ipc.ts`、`preload.ts`、`src/global.d.ts`。
- Reuse: `apps/shared/src/json-rpc-gateway.ts`、`electron/window-connection-route.ts`、`connection-registry.ts` 及现有 local/SSH/remote WS 鉴权解析。
- Create: `tui_gateway/managed_model_runtime.py`、`methods_managed_model.py`、`tests/tui_gateway/test_managed_model_binding.py`。
- Thin registry wiring: `tui_gateway/server.py` 实际方法表，不引入名称 if/elif 长链。

**Interfaces:**

```ts
interface BindPlatformModelInput {
  connection_id: string;
  profile: string;
  session_id: string;
  model_id: string;
  expected_account_revision: number;
}
interface BindPlatformModelResult {
  ready: boolean;
  model_id: string;
  billing_source: 'aino';
  reason_code?: string;
}
// 暴露给 renderer；返回值不含 Key/令牌/目标 URL。
interface PlatformModelsBridge {
  bind(input: BindPlatformModelInput): Promise<BindPlatformModelResult>;
  list(): Promise<PlatformModel[]>;
}
```

main 内部传给受保护 gateway：

```text
session.bind_managed_model {
  session_id, owner: { platform_origin, user_id }, model_id,
  model, api_mode, capabilities, credential_id, api_key,
  base_url, expires_at, binding_revision
}
session.clear_managed_model { session_id, binding_revision }
```

`binding_revision` 防旧清理覆盖新绑定；它不是鉴权 token。gateway 仍必须依现有 transport 主体与会话访问边界验证，不信任 payload 自称 owner。`managed_model_runtime.py` 定义 `ManagedModelBinding` dataclass 与按 live session 身份/owner 保存的内存 registry；无进程级全局 default Key。

在现有gateway能力响应中新增可选 `managed_model_binding: 1`，main绑定前探测该具体能力。未支持时只禁用该连接的平台模型，不以桌面版本号猜能力，也不偷偷写配置传Key。

- [x] **Step 1：main 绑定目标与秘密出口测试。**

```ts
it('binds credentials to the resolved owner without returning them to the renderer', async () => {
  const f = createPlatformBindingRig()
  const result = await f.bind(f.allowedInput)
  expect(f.gateway.lastTarget()).toEqual(f.expectedResolvedTarget)
  expect(f.gateway.lastBinding().api_key).toBe(f.testLease.api_key)
  expect(JSON.stringify(result)).not.toContain(f.testLease.api_key)
  expect(f.rendererEvents()).not.toContainEqual(expect.objectContaining({ api_key: expect.anything() }))
})
```

`createPlatformBindingRig` 在本任务测试中提供实际 binding controller＋共享 RPC client 对本地受控 WS server；只替换平台 HTTP 和 resolver 输入，不能跳过 serialization。
- [x] **Step 2：运行红灯。** Electron binding 测试；`scripts/run_tests.sh tests/tui_gateway/test_managed_model_binding.py`。
- [x] **Step 3：main 解析并认证目标。** 复用既有 registry/connection/profile mapper，不接受任意 URL；远程仅 wss 或既有 SSH 隧道。首次远程授权显示目标主机和会消耗平台额度，确认后记录账户＋准确连接身份的信任；地址、认证主体或用户变化要求重新确认。
- [x] **Step 4：实现 RPC 生命周期。** 使用 `JsonRpcGatewayClient` 加 main socket factory，无新通用网络代理。连接 OAuth 必须取新 WS ticket；不能从 renderer 搬一个缓存 URL 偷懒。绑定后 RPC 只返回安全模型信息；session关闭、用户登出、明确失效时清内存/取消相关调用；网络短断不清用户钱包状态。
- [x] **Step 5：权限、异步、持久化测试。** 错误session/profile/source、旧revision、未授权远程、未登录、明文远程、非desktop会话、弱读权限、关闭后晚到响应、另一个账户都不能绑定。用临时文件系统实际检查 session/config/log 输出无 test Key，而不是扫描源代码找字面量。
- [x] **Step 6：回归/提交。** local/SSH/remote auth既有测试、共享WS客户端回归、Electron/UI typecheck。建议 `feat(desktop): bind platform inference leases to owned sessions`。

## B4：Agent 初始化、重启恢复和真实模型协议

2026-09-15：本地实现已补齐；实际代码、API 差异和测试证据见 [B4 验收记录](../implementation/aino-platform-b4-review.md)。
草稿、三协议真实 Agent 工具往返、四类恢复、profile/branch、显式切换与自动续租已覆盖。
`resolve_managed_runtime(..., now=...)` 使用 Unix 时间戳；新增 `managed_session.py` 承接会话运行时。
辅助任务/并发子任务的费用继承归 B5；真实商业服务与跨仓库账本验收归 D。本地通过不代表正式服务已验收。

**Files（Aino）:**

- Create: `plugins/model-providers/aino/__init__.py`、`plugin.yaml`。
- Extend: `tui_gateway/managed_model_runtime.py`，`methods_session.py` 的 create/lazy resume 参数入口，`model_switch.py` 的提交路径。
- Extract when needed: `tui_gateway/session_model_runtime.py` 承接 server.py 当前 `_resolve_agent_model_runtime` 及有关已持久化运行时解析；更新 in-tree import，不用 compat shim。
- Thin call-site changes: `tui_gateway/server.py` Agent builder、persist/resume；功能放 sibling。
- Test: `tests/tui_gateway/test_managed_model_runtime.py`、`test_managed_model_resume.py`、`tests/plugins/test_aino_provider.py`。

**Interfaces:**

```python
def resolve_managed_runtime(binding: ManagedModelBinding, *, now: float) -> dict:
    """Return existing AIAgent runtime kwargs or a tagged recoverable auth error."""

def persisted_managed_model_metadata(binding: ManagedModelBinding) -> dict:
    """Return only source/owner/model/protocol identifiers, never credentials."""
```

wire API `api_mode` 到 Agent 内部模式的单一表：`chat_completions → chat_completions`，`anthropic_messages → anthropic_messages`；`responses → 既有通用 Responses 传输需要的 codex_responses`，但 provider 必须仍是 aino，不能伪装 `openai-codex` 使用其 OAuth、专属提示词或订阅协议。若现有 generic path不能满足某模型，先走该模型已验证的 chat completions/messages入口；新协议适配另列可测试小提交，不冒称支持。

- [x] **Step 1：真实 Agent 初始化/恢复红灯。** fixture 使用临时 HERMES_HOME、真实 provider discovery、真实 `_make_agent`，API 仅指向本地协议 stub，彻底清除真实凭据环境。

```python
def test_managed_draft_without_byok_waits_for_binding(managed_gateway):
    draft = managed_gateway.create_session(model_source="aino", model_id="fixture-a")
    assert draft["model_status"] == "awaiting_managed_credentials"
    managed_gateway.bind_test_lease(draft["session_id"])
    result = managed_gateway.submit(draft["session_id"], "hello")
    assert result.completed
    assert managed_gateway.upstream_requests[0].provider == "aino"
    assert not managed_gateway.byok_requests
```

`managed_gateway` fixture 在该测试文件建立：实际 JSON-RPC handler＋真实 builder＋本地模型协议 server；提供上述四项操作与实际请求收集，不 stub `_make_agent`。
- [x] **Step 2：红灯。** `scripts/run_tests.sh tests/tui_gateway/test_managed_model_runtime.py tests/tui_gateway/test_managed_model_resume.py tests/plugins/test_aino_provider.py`。
- [x] **Step 3：实现先草稿后绑定。** 扩展 create/resume 可选非秘密 `model_source` 和目录 ID，平台选中后延迟构建直到有效绑定；不因无BYOK落入普通 auth fallback。existing/Bot Chat/profile-following 语义保持；API能力缺失返回可恢复“不支持平台模型绑定”，BYOK仍可用。
- [x] **Step 4：真实协议/恢复。** 确保 `base_url` `/v1` 只加一次，messages SDK的endpoint约定正确；支持 stream、tool_calls、tool result回传、cancel和错误码。DB保存 source/owner/model而不是Key；重启恢复同模型/同费用来源，未绑定前不请求模型。更新 profile 边界、split/background/child继承。
- [x] **Step 5：续租、切换、缓存不变量。** 续租保持系统提示词字节、历史和工具列表不变；受控替换api_key/客户端认证不重建prompt；旧请求返回不能换掉新选模型。发出消息后的模型切换沿用现有确认/切换动作，默认只影响当前选择范围，不写坏所有profile。
- [x] **Step 6：验收/提交。** 实际录到两次HTTP请求的授权和工具往返，核对history persistence无秘密；相关 provider/model/resume tests和sharedUI模型状态测试。建议分成 `refactor(gateway): isolate session model runtime resolution`（若需提取）和 `feat(agent): run managed Aino models through existing transports`。

## B5：辅助调用、fallback 与消费关联

**2026-09-16：本地实现与相关验收完成。** 详见 [B5 验收记录](../implementation/aino-platform-b5-review.md)。当前采用 B4 主进程主动续租；推理拒绝后不自动重放已付费回合，保留结构化错误供 B6 恢复入口使用。实际账本对账及单次调用 ID 持久化仍由 C2 完成。

**Files（Aino）:**

- Create: `tui_gateway/managed_model_usage.py`（回合/调用 ID 与账本展示元数据）。
- Extend narrowly: `agent/auxiliary_client.py`、`agent/auxiliary_wire.py` 的既有主运行时上下文/解析入口；必要逻辑放 `agent/auxiliary_billing_scope.py`，不要再向大文件追加管理器。
- Extend: `tui_gateway/agent_callbacks.py`、`prompt_turn.py`、`turn_metrics.py`、现有子任务/标题/压缩调用参数传递。
- Test: `tests/agent/test_managed_billing_scope.py`、`tests/tui_gateway/test_managed_usage_correlation.py`。

**Interfaces:**

```python
@dataclass(frozen=True)
class BillingScope:
    source: str       # aino | custom | other_existing_provider
    user_id: str | None
    session_id: str
    turn_id: str
    purpose: str
```

这个对象是runtime metadata，不追加到模型system/user消息。HTTP对账头：`X-Aino-Session-Id`、`X-Aino-Turn-Id`、`X-Aino-Call-Id`、`X-Aino-Purpose`；每一次实际HTTP调用唯一call ID，同回合共享turn ID；native自动重试是否实际发出要在transport位置记录。它们不替代服务端生成/上游确认的billing request ID。

- [x] **Step 1：实际解析链红灯。**

```python
def test_byok_auxiliary_never_uses_platform_lease(billing_scope_rig):
    rig = billing_scope_rig
    rig.configure_byok_and_platform()
    rig.run_chat_and_compression(source="custom")
    assert rig.platform_requests == []
    assert {r.billing_source for r in rig.recorded_requests} == {"custom"}
```

`billing_scope_rig` 使用真实 `agent.auxiliary_client` imports和fake HTTP endpoints，test credential明显标记；不能把 `_resolve_auto_route` mock 成期望值。
- [x] **Step 2：红灯。** `scripts/run_tests.sh tests/agent/test_managed_billing_scope.py tests/tui_gateway/test_managed_usage_correlation.py`。
- [x] **Step 3：传递作用域。** 沿现有 runtime main/contextvars/path propagation传递，进程/线程需要明确复制；禁止进程全局最后登录账户。默认所有继承的aux费用来源跟主会话，显式配置另一个provider则向用户显示并尊重；不能静默启用第三方fallback。
- [x] **Step 4：鉴权/流恢复。** 区分本方 `credential_expired` 与上游401；前者可请求main续租并在未生成内容时最多一次安全重试。已输出内容、已调用工具、支付结果未知等不重放整轮。余额/订阅不足保留输入和历史，给充值/选模型入口。当前不启用错误后的自动重放；选择/充值入口在 B6/C4 接线。
- [x] **Step 5：覆盖实际消费者。** 主回答、标题、压缩、vision路由、子任务、并行会话，已有explicit auxiliary override和cron持久运行限制；ContextVar跨线程/子进程需要真实验证。压缩是原有唯一允许的历史变更，此功能不增加其他缓存破坏。当前托管子任务为进程内线程，未支持凭据序列化到 compute-host。
- [x] **Step 6：回归/提交。** 相关Agent/provider/fallback/delegation压缩测试；建议 `feat(agent): preserve billing source across auxiliary calls`。

## B6：模型设置、输入框、空白首页与错误恢复

**Files（Aino）:**

- Create: `apps/desktop/src/store/platform-models.ts`、`platform-models.test.ts`。
- Extend: `src/api/platform.ts`、`src/app/settings/model-settings.tsx`。
- Reuse/extend: `src/components/model-picker.tsx`、`src/app/shell/model-menu-panel.tsx`、`model-catalog-menu.tsx`、`src/app/chat/composer/model-pill.tsx`、`src/app/session/hooks/use-model-controls.ts`、原新建会话提交动作。
- Test: `src/app/settings/platform-model-settings.test.tsx`、`src/app/chat/composer/platform-model-selection.test.tsx`、现有model相关测试。
- Update: 四种locale，必要的 `DESIGN.md` 新行为说明。

**Interfaces:** 使用单一选择值，原非平台选择结构保持兼容：

```ts
type ModelSelection =
  | { source: 'aino'; model_id: string; owner_user_id: string }
  | { source: 'custom'; provider: string; model: string };
```

以上是平台适配层的选择判别；不要把其他已有 providers强制改名custom。持久化原选择时保留现有provider结构，平台新分支单独标识。

- [ ] **Step 1：首页与对话共用状态红灯。**

```tsx
it('keeps the selected platform model after the first message', async () => {
  const f = renderComposerModelFlow()
  await f.selectPlatformModel('fixture-a')
  await f.typeAndSend('hello')
  expect(f.visibleModel()).toBe('Fixture A')
  expect(f.sessionBinding().model_id).toBe('fixture-a')
  expect(f.writtenByokSettings()).toEqual([])
})
```

fixture 复用现有 model controls/composer 测试，模拟 native bridge和gateway响应，不复制一个演示输入框。
- [ ] **Step 2：红灯。** `npm run test:ui -- src/app/settings/platform-model-settings.test.tsx src/app/chat/composer/platform-model-selection.test.tsx`。
- [ ] **Step 3：模型目录/分组。** 默认突出平台模型和费用来源，自定义模型入口继续可达；服务端capabilities控制vision/reasoning工具，不写死默认模型或价格。旧用户显式BYOK默认保持；全新未配置用户选可用平台默认，无默认时给可操作选择页。
- [ ] **Step 4：统一提交入口。** 新会话发送前完成 B3/B4绑定并收到ready；主页model-pill与对话model-pill取同一state。切换账号清目录/钱包缓存；provider目录网络错误不清掉正在工作的BYOK；加载失败区别无权限/无余额/无模型。
- [ ] **Step 5：体验与功能回归。** 选择/搜索/快捷键、来源提示、禁用理由、价格详情、多profile/split、draft附件、模型切换确认、回合取消、stream时控件稳定、原有自定义测试连接，全部按真实renderer测试。
- [ ] **Step 6：验收/提交。** 全UI、Electron测试、typecheck/build；原生截图和一个无手填Key的工具往返。建议 `feat(desktop): add unified built-in and custom model selection`。

## B 阶段停止条件

至少本地真实Agent＋API路由＋账本隔离集成全部通过。正式接入仅把已由用户授权实测成功的模型标为可用；仅有 `/models` 列表、无工具回传或无扣费证据，不算模型功能完成。未能取得正式模型权限时，记录真实联调缺口并继续 C 的可隔离实现。
