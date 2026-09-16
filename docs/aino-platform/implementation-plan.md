# Aino 平台一体化实施总计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 2026-09-16 最新安排：用户已暂停 Claude，后续由 Codex 实施；用户随后允许按需调用子智能体，仅并行独立任务，避免重复验收和无进展重试。B5、C1 本地完成，B6 与 C2–C4、D 的实际进度以 `docs/implementation/aino-platform-progress.md` 为准；历史接口说明见 [接续记录](../implementation/aino-platform-claude-handoff.md)。保留双方已有提交。执行环境没有该技能时，仍按本文件逐项实现、测试、记录，不以技能缺失阻塞。

**Goal:** 让 Aino 使用真实手机号统一登录，登录后可选择平台内置模型并查看余额、充值和消费，同时保留原有自定义模型与 Agent 功能。

**Architecture:** 在现有 Aino-API 内扩展短信身份和桌面适配能力，所有账户/账本继续使用已有服务。Electron 管理平台账户凭据，通过受保护连接向原有 Python 会话绑定短时推理凭据；React 只负责交互。

**Tech Stack:** Aino：Electron 40、React 19、TypeScript、nanostores、Python/JSON-RPC、Vitest/Playwright/Pytest runner。Aino-API：Go（以 `backend/go.mod` 为准，核查时 1.27.0）、Gin、Ent、PostgreSQL、Redis、Vue 3、Pinia、Vitest、现有支付模块、阿里云官方 Go SMS SDK。

**Spec:** [完整设计](/Users/zizimutou/Protect/Aino/docs/aino-platform/design.md)。执行前完整阅读，不只看任务标题。

## Global Constraints

- 产品方案中的第 1–9 节都是全局要求；本计划与子计划共同交付，不只实现界面。
- Aino 路径 `/Users/zizimutou/Protect/Aino`；Aino-API 路径 `/Users/zizimutou/Protect/Aino-API`。
- 正式 origin 为 `https://api.agentera.com.cn`，账户 `/api/v1`，推理 `/v1`；开发/测试必须与生产身份、凭据、Redis、数据库隔离。
- 手机号首选；同一 `users.id`、同一钱包；已有账户绑定不能新建账户或合并余额。
- 独立小登录窗口不改成设置内嵌表单；「我的账户」位于「模型」上方。
- `1234` 只用于显式本地开发，线上/打包生产不能接受固定码。
- 复用模型/支付/身份/JSON-RPC 设施，缺失处做薄扩展；不得新增通用账户中台、第二账本或第三个部署服务。
- 账户 token pair 不进 renderer；推理 Key 仅在 main 与授权 backend 内存；不写 `.env`、会话 DB、日志或 Git。
- 官方/自定义模型费用来源隔离；辅助模型、fallback、子任务、历史恢复也受此约束。
- 不改系统提示词、角色交替和既有 prompt caching，不新增核心模型工具。
- 桌面新文案同步 `zh`、`zh-hant`、`en`、`ja`；命令与 API 标识不翻译。
- 不删除用户工作区、历史或现有自定义 provider；不覆盖已完成 UI 改动。
- Python 必须用 `scripts/run_tests.sh`，不直接跑 pytest；真实链路测试不能全部换成 mocks。
- 已应用的 SQL 迁移不可编辑；仅追加 forward-only 迁移；生成 Ent/Wire 后检查生成物一致。
- 文档/业务实现可在本地分支小提交；推送、合并 main、生产发布、真实短信/付费请求依用户明确授权，不由本方案自动授权。

---

## 0. 给 Claude 的执行指令（可直接复制）

```text
请按以下方案完成 Aino 与 Aino-API 的平台账户、内置模型和充值接入：

先读：
/Users/zizimutou/Protect/Aino/docs/aino-platform/design.md
/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md

再依次读取并执行该总计划链接的 A、B、C、D 四份子计划。
你是执行者，不是只做方案解释；请逐项实现、先写行为测试、运行测试、复核、小提交。
不要跳过站点端、服务端、桌面 main、Python 实际模型链路，只做登录或充值 UI。
保留现有 UI、项目、工具、模型和会话功能，保持账号/钱包唯一，不用固定验证码冒充正式登录。
两仓库都在独立 codex/ 特性分支上工作，执行前核对分支及已有未提交改动。
缺少模板正文/服务端秘密/支付配置时，完成其余实现与隔离测试，把仅真实联调受阻的项列出；不要凭空配置或拿生产做实验。
完成后写出配对 commit SHA、实际测试命令与结果、真实联调回执、迁移/部署/回退步骤、未验证项。
提交交付报告到总计划约定的位置，留给 Codex 最后查漏补缺；未经另行授权不要合并 main 或发布生产。
```

## 1. 文件包与执行顺序

| 顺序 | 子计划 | 实施范围 |
| --- | --- | --- |
| A | [短信与统一账户](/Users/zizimutou/Protect/Aino/docs/aino-platform/01-identity.md) | 数据兼容、短信、登录/绑定、站点 UI、桌面安全登录 |
| B | [内置模型与运行时](/Users/zizimutou/Protect/Aino/docs/aino-platform/02-models.md) | 服务端目录与权限、设备凭据、main→backend、真实 Agent、辅助费用 |
| C | [钱包充值与对账](/Users/zizimutou/Protect/Aino/docs/aino-platform/03-billing.md) | 钱包摘要、回合消费、幂等订单、原生充值、查询恢复 |
| D | [验收、发布与交付](/Users/zizimutou/Protect/Aino/docs/aino-platform/04-delivery.md) | 测试矩阵、隔离集成、真实联调、部署/回退和 Codex 复核材料 |

这是架构级改动，因此拆成可独立验收的阶段；不要在 A 阶段尚未稳定时同时修改余额和支付。每完成一阶段在进度文档标记「实现/自动测试/真实联调」三种状态。正式方案放在 `docs/aino-platform`；项目忽略的 `docs/superpowers` 仅用于临时规划，本包可与特性实现一并纳入版本控制。

## 2. Task 0：基线和开发现场

**Files:**

- Read: 两仓库适用的 `AGENTS.md` / `CLAUDE.md`；Aino 的 `apps/desktop/AGENTS.md`、`apps/desktop/src/AGENTS.md`、`apps/desktop/DESIGN.md`、`tui_gateway/AGENTS.md`。
- Read when touching: Aino `agent/AGENTS.md`、`hermes_cli/AGENTS.md`、`plugins/AGENTS.md`；API `backend/migrations/README.md`。
- Create in Aino: `docs/implementation/aino-platform-progress.md`（实际进度与配对 SHA，不能写秘密）。

**Interfaces:** 消费 spec 的已核实基线；产出实际基线、分支、测试环境地址和未完成材料清单。

- [ ] **Step 1：分别记录 Git 状态和最新提交。** 在各自仓库运行以下只读命令；不默认上次记录仍是最新。

```sh
git status --short --branch
git log -1 --format='%H%n%s'
git remote -v
git worktree list
```

- [ ] **Step 2：确认基础分支包含既有 Aino UI 修复。** Aino 已知基线为 `3bb72e32b1b2a83896439587651d73dd9a3d2319`。执行 `git merge-base --is-ancestor 3bb72e32b1b2a83896439587651d73dd9a3d2319 HEAD`；如果当前 main 不含它，选择含它的用户工作分支作为基底，不自行删除/回滚补丁。工作树脏时区分用户改动，不自动 stash/reset。
- [ ] **Step 3：创建本地分支。** 各仓库分别使用 `codex/aino-platform-identity-models-billing`；如果名称已存在，先检查是否已有本任务进度，再继续，不能重置。

```sh
git switch -c codex/aino-platform-identity-models-billing
```

- [ ] **Step 4：建立隔离本地环境。** API 使用开发专用 PostgreSQL/Redis、独立测试凭据和邮件/SMS/支付 sender 测试适配器；Aino 使用临时 `HERMES_HOME` 和测试 Electron userData。不得使用用户当前 `account.json`、模型 Key、真实聊天记录或生产 DB 执行回归。
- [ ] **Step 5：确认依赖版本和生成命令。** API Go 版本按 go.mod，不擅自降低；执行端缺失工具只报告并使用适用开发容器/既有工具链。Aino JS 依赖在 monorepo 根目录按 lockfile 安装，不能在 workspace 另造 lockfile。新依赖锁定版本，SMS SDK 不用已退役的旧 SDK。
- [ ] **Step 6：保存基线证据。** 按子计划给出的重点测试先跑基线；已有失败逐项记录，不能用跳过测试制造全绿。文档小提交可与首个可测试实现一起完成。

## 3. 文件职责与变更边界

以下是新增代码的建议精确位置。若执行时已有同职责模块，优先扩展它并在报告记录映射，不复制第二个。大文件只增加薄调用/注册，逻辑放 topical siblings。

| 仓库 | 新增/扩展位置 | 单一职责 |
| --- | --- | --- |
| API | `backend/internal/service/phone_identity.go`、`auth_phone.go`、`auth_phone_binding.go` | 正规化与 canonical phone 身份、注册登录、绑定事务 |
| API | `backend/internal/service/sms_service.go`、`sms_aliyun.go`、`setting_sms.go` | challenge 生命周期、短信适配、管理员配置 |
| API | `backend/internal/repository/sms_cache.go` | Redis 原子限流、校验尝试和消费 |
| API | `backend/internal/handler/auth_phone_handler.go`、`user_phone_handler.go` | 薄参数/主体/响应处理 |
| API | `backend/internal/service/desktop_models.go`、`desktop_credentials.go` | 官方目录聚合、设备推理租约 |
| API | `backend/internal/handler/desktop_handler.go`、`server/routes/desktop.go` | 受用户鉴权的桌面适配接口 |
| API | `backend/internal/service/payment_order_idempotency.go`、`payment_quote.go` | 在原订单流程补持久幂等与可复用报价 |
| API | `backend/internal/service/desktop_billing.go` | 原账本与 usage 的只读汇总 |
| Aino | `apps/desktop/shared/platform-contract.ts` | renderer/main 共用的无秘密 DTO 与 IPC 参数 |
| Aino | `apps/desktop/electron/platform-client.ts`、`platform-auth.ts`、`platform-token-store.ts` | 可信 origin HTTP、账户状态/刷新、安全持久化 |
| Aino | `apps/desktop/electron/platform-ipc.ts`、`platform-runtime-binding.ts` | 有限 IPC、可信后台推理绑定与撤销 |
| Aino | `apps/desktop/src/store/account.ts`、`src/api/platform.ts` | 原账户 UI 的平台状态适配，不持有 Key |
| Aino | `apps/desktop/src/store/platform-models.ts` | 官方目录/选择缓存，按账户 generation 清理 |
| Aino | `tui_gateway/managed_model_runtime.py`、`methods_managed_model.py` | 会话级内存租约与 RPC，不管理用户钱包 |
| Aino | `plugins/model-providers/aino/` | 第一方 provider 元数据注册，不执行网络登录 |
| Aino | `apps/desktop/src/app/settings/platform-billing/` | 平台余额/订单 UI，与原 Nous 信用卡逻辑隔离 |

`shared/platform-contract.ts` 需要同步相关 TS include/import 配置，不引入新的 npm 包。账户调用与原 Agent gateway transport auth 分离，不能把所有 `account.*` RPC 机械替换成公网调用。

## 4. 统一测试与提交节奏

每个任务都执行：行为测试 → 确认红灯 → 最小实现 → 确认绿灯 → 相关回归 → 查看 diff → 小提交。不可只匹配源代码文本，不以固定模型名称/列表个数作为测试。

测试的 `f`/`rig` 指由该任务建立的 fixture：真实业务 service、实际路由/导入、临时 DB/Redis，外部供应商 I/O 可以可控替身。不得把 Aino-API auth service、Agent builder 和支付履约都 mock 掉后称为集成。

推荐每个任务分别记录如下证据，不需在每次完成都等待用户批准普通下一任务：

```text
任务 ID：B3
仓库与 commit：
红灯测试命令及关键失败：
实现与契约差异：
绿灯/相关回归命令及结果：
端到端证据路径（不含秘密）：
需要线上材料才能验证的项目：
```

阶段最小门槛：

```sh
# Aino 仓库根目录；范围随任务扩大
scripts/run_tests.sh tests/tui_gateway/test_account_methods.py

# Aino/apps/desktop
npm run test:ui -- src/app/account src/store/account.test.ts
npm run test:desktop:platforms -- electron/account-window.test.ts
npm run typecheck

# Aino-API/backend
go test ./...
go test -tags=unit ./...
go test -tags=integration ./...

# Aino-API/frontend
pnpm run test:run
pnpm run typecheck
pnpm run lint:check
```

完整验收按 D 计划执行。没运行的写「未运行」；mock 通过写「隔离测试通过」；不把当前机器没装 Docker 造成的 integration skip 记成通过。

## 5. 交付给用户与 Codex 的内容

- `docs/implementation/aino-platform-progress.md`：完整任务状态。
- `docs/implementation/aino-platform-delivery.md`：两仓库配对 SHA、变更/测试/未验证项、已知风险。
- Aino-API `docs/aino-platform-deployment.md`：具体配置键、迁移文件、构建/部署、灰度、回退步骤。
- Aino `docs/desktop-account-auth.md`：改成真实平台登录说明，标清开发模式边界。
- Aino `docs/aino-platform-user-guide.md`：手机号登录/绑定、内置与自定义模型、币种与充值、错误恢复。
- 脱敏自动化/端到端报告以及必要原生截图；大体积截图放受控 artifacts，不混入临时 build 目录提交。

未授权推送时只交付本地提交和 diff；用户授权推送后，推送到自己两个仓库的特性分支并提供对应 PR。不要仅用一个仓库的通过结果代表两仓库全部完成。

Codex 最终审查关注：账本正确、身份绑定不越权、秘密不泄露、原功能未退化、真实请求/付款行为与界面一致。具体检查表见 D 计划。
