# C：钱包、充值与对账 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在桌面查看同一账户余额、充值订单与真实消费，支付后准确到账，重试不重复建单/加款。

**Architecture:** 复用 Aino-API 既有 balance/subscription/usage/payment service，新增的 desktop DTO 只做聚合。支付保留既有验签/履约，以实际服务端记录确认；React/native主进程均不计算最终入账。

**Tech Stack:** 现有 Go PaymentService、decimal、PostgreSQL；Electron typed client；React/nanostores及共享控件。

**Spec:** [完整设计第 5.3、5.4、7–9 节](/Users/zizimutou/Protect/Aino/docs/aino-platform/design.md)。

## Global Constraints

- 遵守[总计划](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)；消费关联依赖 B5，账户主体依赖 A。
- 账户余额沿用 USD/`NUMERIC(20,8)`，支付币种沿用渠道配置；不得直接把美元显示成元。
- 前端金额是展示/请求输入，不决定账本；新增 DTO 使用十进制字符串，旧接口保持兼容。
- 支付 `PAID` 不等于入账 `COMPLETED`；回跳不能授权加款。
- 新桌面下单必带 `client_order_id`；普通站点旧客户端不强制同步升级。
- 自定义模型消费不能在 Aino 钱包扣款；不新增自动充值或一套新套餐体系。

命令工作目录：`go`/`make generate` 在 `/Users/zizimutou/Protect/Aino-API/backend`；`pnpm` 在其 `frontend`；`scripts/run_tests.sh` 在 `/Users/zizimutou/Protect/Aino`；`npm` 在 `/Users/zizimutou/Protect/Aino/apps/desktop`。所有 `/payment/*`、`/usage*` 简写均以 `/api/v1` 为前缀。

## C1：钱包摘要、报价与真实金额

**Files（Aino-API）:**

- Create: `backend/internal/service/desktop_billing.go`、`desktop_billing_test.go`、`payment_quote.go`、`payment_quote_test.go`。
- Extend: `desktop_handler.go`、`routes/desktop.go`；`payment_handler.go`、`routes/payment.go`。
- Reuse: `payment_order.go` 的金额/渠道选择函数、`payment/config` service；用户/订阅/usage services。
- Test: `backend/internal/handler/desktop_billing_handler_test.go`、`payment_quote_handler_test.go`。

**Interfaces:**

```ts
interface PlatformWalletSummary {
  currency: 'USD';
  balance: string;
  frozen_balance: string;
  available_balance: string;
  payment_enabled: boolean;
  active_subscriptions: Array<{
    id: string; name: string; expires_at: string;
    remaining: string | null; unit: string;
  }>;
  updated_at: string;
}
interface PaymentQuoteInput { amount: string; payment_type: string; order_type: 'balance' }
interface PaymentQuote {
  requested_amount: string;
  pay_amount: string;
  payment_currency: string;
  credit_amount: string;
  credit_currency: 'USD';
  fee_amount: string;
}
```

`available_balance` 从同一既有余额/冻结语义计算，不能把订阅剩余额度加进现金余额。只有实际适用的订阅能够为模型提供额度；余额为0但有效订阅仍可用的情况必须正确。

- [ ] **Step 1：精度和来源合同。** 建立基于真实 quote/order计算的 fixture，改变费率/换算率后比较两条链路一致，不冻结当前政策值。

```go
func TestQuoteMatchesTheActualOrderAmounts(t *testing.T) {
    f := newPaymentQuoteRig(t)
    quote := f.QuoteBalance("20.00", "alipay")
    order := f.CreateBalanceOrder("20.00", "alipay", uuid.NewString())
    require.Equal(t, quote.PayAmount, f.DecimalPayAmount(order))
    require.Equal(t, quote.CreditAmount, f.DecimalCreditAmount(order))
    require.Equal(t, quote.PaymentCurrency, order.Currency)
    require.EqualValues(t, 1, f.OrderCount()) // quote itself created nothing
}
```

`newPaymentQuoteRig` 放在 `payment_quote_test.go`；fake仅在支付 provider，PaymentService、配置和金额函数真实运行。
- [ ] **Step 2：红灯。** `go test ./internal/service ./internal/handler -run 'QuoteMatches|DesktopWallet'`。
- [ ] **Step 3：抽取共享 quote resolver并实现只读接口。** 计算顺序复用 `requested amount → credited balance multiplier → fee → payment currency rounding`；quote只读、不建订单、不调用支付创建API。下单仍由原函数重算/锁定，若与已展示quote不同，客户端必须重新展示最终金额并让用户确认后付款。
- [ ] **Step 4：wallet 正确来源与鉴权。** `GET /desktop/billing-summary` 从当前auth主体取数据；不可接受任意userID；所有金额decimal string。支付关闭仍能查看余额/历史；没有订阅为真实空，不用假套餐卡片。
- [ ] **Step 5：覆盖边界并提交。** 负数、NaN、无穷、科学记数超界、精度、最小最大额、费率/币种冲突、用户禁用、零余额有效订阅、跨用户数据。跑相邻billing/payment测试。建议 `feat(billing): add authoritative wallet and recharge quote views`。

## C2：消费记录、回合关联与结算状态

**Files（Aino-API）:**

- Extend: `backend/ent/schema/usage_log.go`、新 migration `241_desktop_usage_correlation.sql` 与必要独立 `_notx.sql` 索引文件（编号冲突顺延）。
- Create: `backend/internal/server/middleware/desktop_usage_context.go` 及测试。
- Extend: `backend/internal/handler/usage_handler.go`、`dto/types.go`/`mappers.go`、`backend/internal/pkg/usagestats/usage_log_types.go`、`backend/internal/repository/usage_log_repo.go`/`usage_log_repo_stats.go`、用量写入实际入口。
- Test: `backend/internal/repository/desktop_usage_integration_test.go`、`backend/internal/handler/desktop_usage_handler_test.go`。

**Files（Aino）:**

- Extend: `tui_gateway/managed_model_usage.py`、`turn_metrics.py`，回复持久化display metadata。
- Extend: `apps/desktop/src/components/assistant-ui/thread/reply-metrics.tsx`、新增 `src/app/settings/platform-billing/usage-view.tsx`。
- Test: `tests/tui_gateway/test_managed_usage_correlation.py`、`reply-metrics` UI关联测试。

**Interfaces:** 在现有 `/usage`/`usage/stats` 增加可选 `session_id`、`desktop_turn_id`、`desktop_call_id`、`desktop_purpose` 查询字段；新增响应金额字符串 `actual_cost_decimal`，保留原actual_cost字段。对账字段为可空加法；普通API请求没有这些字段仍正常。

- [ ] **Step 1：跨用户过滤和实际扣费关系测试。**

```go
func TestDesktopUsageDoesNotLeakAcrossUsersWithSameTurnID(t *testing.T) {
    f := newDesktopUsageRig(t)
    turn := uuid.NewString()
    f.RecordSettledCall(17, turn, "chat", "0.01000000")
    f.RecordSettledCall(18, turn, "chat", "0.99000000")
    rows := f.ListAsUser(17, turn)
    require.Len(t, rows, 1)
    require.Equal(t, "0.01000000", rows[0].ActualCostDecimal)
}
```

fixture使用真实usage repository＋handler和付款扣减命令，不通过fixture伪造过滤结果。另测用户余额减少/适用订阅消耗与同组结算记录之间关系。
- [ ] **Step 2：红灯。** `go test -tags=integration ./internal/repository ./internal/handler -run DesktopUsage`。
- [ ] **Step 3：接收并剥离对账头。** 仅对托管Key接受 B5 的X-Aino字段，严格长度/UUID/用途校验；从鉴权主体决定user/key，客户端不能选择计费主体。透传 upstream 时移除专用头，防止把会话/用户数据作为第三方归因标签。不要改变现有账本的 `(request_id, api_key_id)` 去重键。
- [ ] **Step 4：真实记录/索引。** 在现有usage写入路径增字段并支持索引过滤；一个工具回合多次模型请求，每次call ID各自记录，UI按turn聚合。title/compression等保持独立用途，不能把输入token估价当真实actual_cost。对已接受但尚未写入usage的请求明确pending；失败无usage不能假定收费0。
- [ ] **Step 5：展示最终一致性。** Aino保存该回合实际发出的call IDs作为display metadata，利用原usage/errors记录查询匹配；全部已返回确定结算/不计费状态时才标settled。未能确定则显示「费用核对中」/「部分费用已结算」，有限重试后给查看明细入口；不要无限加载或猜0。没有通用settlement数据时，扩展已有usage结果DTO补 `settlement_status`，由真实账本/错误记录决定，不能仅按客户端expected_count签结算。
- [ ] **Step 6：验证/提交。** A/B两账户同turn、同用户并发回合、压缩后session lineage、账本延迟、模型失败/取消、多次工具调用、BYOK不触发wallet消费。记录服务器扣费和客户端展示一致；建议 `feat(billing): correlate per-turn usage with the existing ledger`。

## C3：订单持久幂等、异常恢复与回调安全

**Files（Aino-API）:**

- Extend: `backend/ent/schema/payment_order.go`、新 migration `242_payment_client_order_id.sql`。
- Create: `backend/internal/service/payment_order_idempotency.go`、`payment_order_idempotency_test.go`。
- Extend: `payment_order.go`、`payment_handler.go`、相关response DTO、`frontend/src/types/payment.ts`。
- Reuse: `backend/internal/service/idempotency.go`、`handler/idempotency_helper.go`、现有 provider query/fulfillment lease、`payment_fulfillment.go`、`payment_webhook_handler.go`。
- Test: `backend/internal/service/payment_order_idempotency_integration_test.go`、`payment_fulfillment`/webhook既有测试。

**Interfaces:**

```text
POST /payment/orders:
  existing numeric amount/payment_type/order_type/return_url fields
  + amount_decimal (optional decimal string; new desktop uses this)
  + client_order_id (optional for old clients, mandatory for desktop)

GET /payment/orders/:id:
  existing order fields
  + valid checkout { qr_code, pay_url, expires_at } for the authenticated owner
  + confirmation_required when recovered price differs from requested quote
```

持久化 `client_order_id`、规范请求hash；对非空 `(user_id, client_order_id)` 加unique。既有order id/out_trade_no继续用，不重新定义财务主键。checkout可能含敏感支付链接，仅返回当前owner，不能写公开日志。

main把 `PaymentQuoteInput.amount` 映射为 `amount_decimal`，不能把JSON字符串直接塞进旧float64 `amount`字段。handler新增字符串字段并严格parse/校验，沿既有金额量化传给PaymentService；同时存在两种金额且不一致返回400。摘要使用规范十进制表示，`20`与`20.00`代表同一金额。

- [ ] **Step 1：复现重复创建和外部超时。**

```go
func TestOrderRetryKeepsOneMerchantOrder(t *testing.T) {
    f := newPaymentIdempotencyRig(t)
    id := uuid.NewString()
    first := f.CreateAs(17, id, "20.00")
    second := f.CreateAs(17, id, "20.00")
    require.Equal(t, first.OrderID, second.OrderID)
    require.EqualValues(t, 1, f.ProviderCreateCount())
    require.Equal(t, http.StatusConflict, f.CreateStatusAs(17, id, "30.00"))
}
```

fixture必须用真实PaymentService/DB事务与可记录的provider；加并发创建和“provider接单后HTTP超时”的测试。
- [ ] **Step 2：红灯。** `go test -tags=integration ./internal/service -run 'OrderRetry|PaymentIdempotency|PaymentUnknown'`。
- [ ] **Step 3：先占持久请求，再调用渠道。** 同主体同ID查询已存订单，校验请求hash；新请求事务创建pending，领取单订单创建/恢复lease，提交后调用provider。重复操作不能重新生成out_trade_no；进程重启后也可恢复。数据库/幂等设施故障不得降级成重复创建。
- [ ] **Step 4：处理外部unknown和旧客户端兼容。** 已发到provider但超时，保留待确认订单，优先按相同out_trade_no查询；查询尚无确定结果时不新建商户单，给待确认状态。只有明确未发出/明确失败可安全重试同订单。旧站点不传client_order_id仍保留原API兼容，不把全站客户端一夜变成400。
- [ ] **Step 5：验签/幂等入账回归。** 复用原签名/金额/币种/商户验证；重复callback、乱序callback、异常订单状态、并发履约只能一次入账；客户端status/跳转页不能更新balance；校验其他用户orderID不可查/取消；退款/取消后不能再次错误履约。
- [ ] **Step 6：测试/提交。** `make generate`；Go默认/unit/integration中payment路径；网站支付回归。建议 `fix(payment): make desktop checkout resumable and idempotent`。

## C4：原生钱包、充值与订单恢复 UI

**Files（Aino）:**

- Create: `apps/desktop/src/app/settings/platform-billing/api.ts`、`types.ts`、`wallet-view.tsx`、`recharge-view.tsx`、`order-list.tsx`、`use-order-status.ts`、相应测试。
- Extend: `src/app/settings/account-settings.tsx`、现有 settings registry入口、`src/api/platform.ts`。
- Extend: `shared/platform-contract.ts`、`electron/platform-client.ts`、`platform-ipc.ts`、preload类型。
- Preserve: `src/app/settings/billing/` 原Nous信用卡/订阅协议，不能机械换域名后作为Aino支付。
- Reuse: 现有Button/Dialog/SegmentedControl/ListRow/ErrorState/金额格式化基础组件，二维码依赖按root锁文件管理。

**Interfaces:**

```ts
interface PlatformBillingBridge {
  summary(): Promise<PlatformWalletSummary>;
  checkoutInfo(): Promise<PlatformCheckoutInfo>;
  quote(input: PaymentQuoteInput): Promise<PaymentQuote>;
  createOrder(input: PaymentQuoteInput & { client_order_id: string }): Promise<PlatformOrder>;
  getOrder(order_id: string): Promise<PlatformOrder>;
  listOrders(input: { page: number; page_size: number }): Promise<PlatformOrderPage>;
  cancelOrder(order_id: string): Promise<PlatformOrder>;
  listUsage(input: PlatformUsageQuery): Promise<PlatformUsagePage>;
}

type PlatformOrderStatus =
  | 'PENDING' | 'PAID' | 'RECHARGING' | 'COMPLETED' | 'EXPIRED'
  | 'CANCELLED' | 'FAILED' | 'REFUND_REQUESTED' | 'REFUNDING'
  | 'REFUND_PENDING' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'REFUND_FAILED';
interface PlatformOrder {
  order_id: string;
  client_order_id: string | null;
  status: PlatformOrderStatus;
  payment_type: string;
  pay_amount: string;
  payment_currency: string;
  credit_amount: string;
  credit_currency: 'USD';
  created_at: string;
  expires_at: string;
  can_cancel: boolean;
  confirmation_required: boolean;
  checkout: null | { qr_code: string | null; pay_url: string | null; expires_at: string };
}
interface PlatformCheckoutInfo {
  payment_enabled: boolean;
  balance_disabled: boolean;
  methods: Array<{
    id: string; display_name: string; currency: string;
    min_amount: string; max_amount: string; available: boolean;
  }>;
  help_text: string;
}
interface PlatformUsageQuery {
  page: number; page_size: number;
  session_id?: string; desktop_turn_id?: string; desktop_call_id?: string;
  desktop_purpose?: string; start_date?: string; end_date?: string;
}
interface PlatformUsageRow {
  id: string; request_id: string; model: string;
  session_id: string | null; desktop_turn_id: string | null;
  desktop_call_id: string | null; desktop_purpose: string | null;
  actual_cost_decimal: string | null;
  currency: 'USD';
  settlement_status: 'pending' | 'settled' | 'not_charged' | 'unknown';
  created_at: string;
}
interface PlatformOrderPage { items: PlatformOrder[]; page: number; page_size: number; total: number }
interface PlatformUsagePage { items: PlatformUsageRow[]; page: number; page_size: number; total: number }
```

`PlatformOrder`必须覆盖现有完整状态枚举、order_id、payment/credit金额与币种、expiry、checkout、是否可取消；`PlatformCheckoutInfo`沿用服务端配置，main在共享contract统一camel/snake转换，不能每组件自行猜字段。

- [ ] **Step 1：状态与关闭恢复红灯。**

```tsx
it('does not claim credited while payment is still recharging', async () => {
  const f = renderRechargeFlow({ status: 'RECHARGING' })
  expect(await screen.findByText('已支付，正在到账')).toBeVisible()
  expect(screen.queryByText('充值成功')).not.toBeInTheDocument()
  await f.closeAndReopen()
  expect(f.api.createOrder).toHaveBeenCalledTimes(1)
  expect(f.api.getOrder).toHaveBeenCalledWith(f.orderId)
})
```

`renderRechargeFlow` 由真实account/recharge组件＋注入bridge渲染，poll可使用可控clock；测试实际UI行为，不直接调用同名假状态机。
- [ ] **Step 2：红灯。** `npm run test:ui -- src/app/settings/platform-billing`。
- [ ] **Step 3：我的账户钱包与历史。** 扁平UI展示余额/实际币种、订阅分开、充值入口/消费/订单/设备列表；离开页不持续poll钱包；返回或回合结束/到账信号触发限频刷新。所有cache按platform origin＋user ID，过期响应不能覆盖新账号。
- [ ] **Step 4：充值步骤。** 输入金额→选择已启用渠道→展示服务端quote中的支付/手续费/到账→显式创建订单→扫码/系统浏览器付款→订单状态。二维码close只隐藏；取消是单独操作。同一次意图生成一次client_order_id；超时/多次点击重用，不因组件重渲染变ID。恢复失败可从服务器订单列表找同一订单。
- [ ] **Step 5：轮询与URL安全。** 页面可见且pending时约3秒轮询，隐藏暂停，5xx指数退避至最多30秒，过期/完成/退出停止；短时异常不能显示未支付并新建。HTTP网络client不对create自动重试；回跳只刷新order。支付URL只接受经服务端配置/校验的合法HTTPS渠道，不允许javascript/file/任意custom scheme；外部页面不注入preload或账户header。
- [ ] **Step 6：回合小字与自定义费用。** C2真实actual_cost显示，不影响原token/上下文计时；BYOK明确“由自定义服务商计费”，不显示Aino钱包消费0伪装免费。重复通知/后台支付完成只更新数据与轻提示，不抢走当前聊天。
- [ ] **Step 7：测试/提交。** 并发窗口下单、先关闭后到账、全状态、过期二维码、无渠道、limit/币种错误、401/断网、账户切换、辅助消费、长金额格式、light/dark/system、窄窗口。全UI/Electron/typecheck/build，建议 `feat(desktop): add Aino wallet and resumable recharge flow`。

## C 阶段完成条件

隔离环境中真实APIKey鉴权推理→账本扣费→桌面记录，以及真实订单创建→签名回调→一次性入账→桌面刷新全部通过。实际支付宝/微信到账需要用户提供渠道配置和明确小额测试授权后才能标记通过；无真实付款时写「支付链路隔离验收通过，线上支付未验证」。
