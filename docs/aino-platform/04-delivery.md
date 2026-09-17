# D：验收、上线与交付 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用真实执行证据证明账户、模型、充值与原有功能都正确，交给用户可部署的配对版本，再供 Codex 查漏补缺。

**Architecture:** 单测锁定边界，隔离集成跑真实业务组件，原生桌面覆盖交互，授权后的预发布/生产灰度验证真实外部服务。发布顺序是 API 兼容扩展 → 配置/灰度 → Desktop。

**Tech Stack:** 现有 Go/unit/integration tests、真实 PostgreSQL/Redis、Vitest/Electron/Playwright、Python `scripts/run_tests.sh`、现有构建发布脚本。

**Spec:** [完整设计](/Users/zizimutou/Protect/Aino/docs/aino-platform/design.md)。

**2026-09-17 第 1、2 项执行回写：** 已完成 SQLite 活库竞态修复与新较广回归（18,593/1/209，无 SIGBUS），唯一测试 guard 失败另以 41 项关闭；并发刷新／退出和断网／授权撤销恢复两条原生切片分别通过。菜单及离线引导缺陷已修复；UI 7,982/1 后测试修正另以 115 项关闭。精确源码、失败及后续成功分别见[本轮回执](../implementation/aino-platform-account-edges-validation-20260917.json)及矩阵 E26–E30。本轮不包含签名、上线、真实供应商或全部 D 门禁。

**前次执行回写（历史）：** 旧核心原生用例已通过登录→Agent 工具→停止结算→充值→重启重新认证/历史重绑定→BYOK 及秘密审计（夹具 `32c0ca8eae` / API `ff00058c3`）。本次独立工作区切片在业务 `8e8699e4b1` / API `a5f720aa8` 上通过（1 项、22.5 秒），包含工具、回默认、双窗口账户/钱包一致和隐藏恢复；充值后网站独立核对在业务 `0eace11bfc` / API `a5f720aa8` 上通过（1 项、1.3 分钟，checkout `3300447627` 不等于被测构建）。完整 UI 在 `8e8699e4b1` 上通过 874 文件/7,979 项，Vitest 354.69 秒、外层命令 355.49 秒、exit 0。后续清理修复 `3517ccfd3b` 经 2 项行为 RED、3 文件/124 项 GREEN（4.58 秒）、三个 TS 配置/scoped lint 和独立 `delivery_audit` APPROVED，唯一 P2 已关闭；最终开发构建 `3517ccfd3b` 各步骤 exit 0，395 文件 dist 清单/日志哈希及 E2E 夹具提交 `855edc2e1d` 已记录，见[接续验证回执](../implementation/aino-platform-continuation-validation-20260917.json)。正常签名发行启动、Python SIGBUS、矩阵其余异常/远程/并发场景、跨平台与真实服务仍开放。逐项事实及回执见[验收矩阵](../implementation/aino-platform-acceptance-matrix.md) E18/E21–E25；下列复选框只按完整满足的具体步骤勾选，不把切片成功视为整个 D 完成。

## Global Constraints

- 遵守[总计划](/Users/zizimutou/Protect/Aino/docs/aino-platform/implementation-plan.md)，按 A → B → C → D 顺序完成。
- 不把 mock、skip、未运行、仅健康检查、仅模型列表当作真实链路验收。
- 真实短信、模型消费、支付、生产部署在已有明确授权及明确目标/金额范围内执行。
- 旧 SQL 不改 checksum；回退保留新账户/订单/账本数据。
- 不推送上游、不自动合并 main、不覆盖用户未提交改动；用户追加明确授权时按授权继续。

## D1：建立完整隔离集成夹具与验收记录

**Files:**

- API Create: `backend/internal/integration/aino_platform_test.go`（使用仓库现有 e2e tag/runner惯例）。
- API Create: `backend/internal/integration/aino_platform_fixture_test.go`；按已有 integration fixture启动真实schema、auth/APIKey/payment/usage components。
- Aino Create: `apps/desktop/e2e/platform-account-model-billing.spec.ts`；fixture复用既有Electron launch/临时userData方案。
- Aino Update: `docs/implementation/aino-platform-progress.md`。

**Interfaces:** 每次测试生成 `run_id`，关联各仓库commit、独立DB/Redis、app userData、测试HERMES_HOME和人工可读报告。fake供应商数据只能来自 `fixture-*`，端到端业务service仍是真实实现。

- [x] **Step 1：建立 isolated infrastructure。** 复用项目既有testcontainers Postgres/Redis setup，不连接生产；SMS和模型/支付出口替换为协议兼容的本地服务。fake模型需要支持先tool_call、再收到tool_result后最终回答，不能只永远返回hello。
- [x] **Step 2：写跨仓库核心场景。** 已以 E18 核心原生、E21 工作区、E22 充值后双端三条独立隔离切片实现并执行下列场景；源码/构建分别记录，供应商为本地替身。剩余矩阵在后续步骤单列；清理修复定向证据另记 E24。

```text
given: 隔离API实例、允许注册的测试配置、测试官方模型组、余额初始值
when: 新手机号经fake短信sender取得随机验证码并在真实API验证
and: Electron通过真实账户接口登录，创建/绑定会话后发送任务
and: 真实Agent执行一个临时目录内只读工具，继续请求模型完成回复
then: Account user_id一致；工具往返成功；实际usage存在；余额变化可对账
when: 在桌面创建充值订单，本地provider返回签名正确的支付回调
then: 服务端只入账一次；桌面订单COMPLETED；网站和桌面看到同一新余额
when: 重启桌面、恢复会话、切换工作区、再切换BYOK发送
then: 身份/账户正确；Key重绑定；BYOK请求不产生Aino账本消费
```

- [x] **Step 3：建立老用户升级场景。** 初始DB是旧schema生成且含真实结构的email/oauth用户、余额、订单、订阅和普通Key的测试副本；执行全部新迁移后绑定phone，确认ID、余额、订单、旧登录/Key保持可用。测试此后服务端回退到已验证兼容版本。
- [ ] **Step 4：执行下表所有覆盖项。** 记录「自动化通过/人工通过/未验证/失败」，失败必须有复现路径和修复提交，不只截图。

## 必须覆盖的验收矩阵

| ID | 场景 | 通过条件 |
| --- | --- | --- |
| AUTH-01 | 新手机号注册登录 | 服务端创建唯一users/phone identity，JWT刷新机制正常 |
| AUTH-02 | 旧手机号再次登录 | 相同user ID，余额/历史订单不变 |
| AUTH-03 | 已有邮箱/第三方账户绑定 | 原账户登录后验证手机；绑定后仍原user ID；不发重复赠金 |
| AUTH-04 | 手机号占用/篡改user ID | 冲突/拒绝；不并号、不转余额 |
| AUTH-05 | 并发发码/验证码重放 | 冷却/配额原子；一份challenge只有一个消费成功 |
| AUTH-06 | 码过期、错误耗尽、手机号改变 | 旧码不可复活或验证另一手机号；TTL不随错误延长 |
| AUTH-07 | 绑定码与登录码串用 | purpose和主体不符必须拒绝 |
| AUTH-08 | Redis/短信供应商故障 | fail closed或结果未知；无重复发送、无假登录 |
| AUTH-09 | 线上固定1234/生产误开dev | 拒绝；开发进程对正式域名也不接受固定码 |
| AUTH-10 | 封禁、注册关闭、邀请码、协议、TOTP | 保持既有政策；MFA完成前没有正式token |
| AUTH-11 | phone-only邮箱兼容 | 占位地址不作为邮箱认证/通知/用户名；真实邮箱绑定可完成 |
| AUTH-12 | 删除最后一个登录身份 | 旧通用解绑API也不能锁死账号 |
| DESK-01 | 原生登录与成功切换 | 独立小窗口；恢复主窗口尺寸后才挂载工作区 |
| DESK-02 | 项目/profile/本地/SSH切换 | 商业账户与余额不变化；后台routing正确 |
| DESK-03 | 多窗口同时刷新/退出 | 一次refresh；所有窗口一致；旧响应不能复活旧用户 |
| DESK-04 | 安全存储关闭/损坏/不可用 | 平台账户无明文落盘，session-only明确，启动无反复keychain弹窗 |
| DESK-05 | 隐藏窗口后显示/断网恢复 | 没有错误清空账户、侧栏频闪或无限加载 |
| MODEL-01 | 全新安装无BYOK | 登录后能通过服务端默认模型绑定发送，不先报缺Key |
| MODEL-02 | 内置模型权限 | 目录与API鉴权一致，绕过UI请求禁止模型仍被拒绝 |
| MODEL-03 | 平台工具/流式/停止 | 原工具审批、tool result往返、流式、cancel可用 |
| MODEL-04 | 凭据秘密边界 | renderer/IPC结果/localStorage/配置/会话DB/日志无token/Key |
| MODEL-05 | Key过期/父会话注销/设备撤销 | 租约按期更新，注销后Key失效，普通站点Key不受误伤 |
| MODEL-06 | 未授权远程/换目标地址 | 不发平台Key；明确授权后只给该主体该连接的租约 |
| MODEL-07 | 历史恢复/压缩后恢复 | 原model/source/owner正确；临时Key重新取得，不从DB恢复秘密 |
| MODEL-08 | 平台/BYOK切换、首页转对话 | 同一选择状态、不覆盖自定义配置、不隐式跨来源fallback |
| MODEL-09 | 标题/压缩/视觉/并行子任务 | 默认继承正确来源；显式辅助来源可见；无隐形额外平台扣费 |
| MODEL-10 | 多账户/多会话并行 | A的租约/余额/延迟响应不进入B；各会话独立 |
| MODEL-11 | API401/429/断流/余额不足 | 不将上游401当用户退出，不无限重试，不重放工具副作用 |
| MODEL-12 | prompt caching与原功能 | 续租不改prompt/history/toolset；终端/摘要/项目等仍可用 |
| MODEL-13 | cron/Bot/持久后台任务 | 既有BYOK继续工作；短期平台租约不能被当成永久任务授权 |
| MONEY-01 | 余额、冻结、订阅显示 | 服务端事实；USD账本与CNY支付分开，订阅不并入现金余额 |
| MONEY-02 | token/缓存/阶梯/倍率 | 实际账本金额正确；桌面不按token粗估当已扣费 |
| MONEY-03 | 一回合多次请求/辅助消费 | 所有call IDs可查，合计与真实记录一致，pending不假装0 |
| MONEY-04 | 对账越权与头信息 | 同turn ID不同用户不串；专用头不原样发第三方 |
| PAY-01 | 报价 | quote无订单/无外部支付创建；同配置与订单金额一致 |
| PAY-02 | 重复点击/并发/重启后重试 | 同client_order_id只一个订单/商户单，金额变化返回冲突 |
| PAY-03 | 接单后超时/本机断网 | 恢复同out_trade_no；不重新扣款、不立刻假定失败 |
| PAY-04 | 正常支付/到账中 | PAID/RECHARGING不提前成功；COMPLETED对应一次实际加款 |
| PAY-05 | 重复、乱序、伪造回调 | 原验签/金额/币种/商户校验生效；并发履约仍只一次 |
| PAY-06 | 关闭/重开/过期/取消/退款 | 原订单可恢复，各状态准确，不因关UI自动取消 |
| PAY-07 | 其他用户订单/任意支付URL | 拒绝跨用户读取/取消；系统浏览器打开经过校验HTTPS，无账户token泄漏 |
| PAY-08 | 线上支付关闭、渠道不足 | 仍可看余额/记录；充值有真实不可用说明，无假成功 |
| UX-01 | 明亮/暗色/跟随系统 | 新页面复用Aino tokens，不引入另一套外观 |
| UX-02 | 四语言/键盘/窄窗口 | 文案齐全、OTP粘贴/返回/倒计时/错误恢复可操作 |
| UPGRADE-01 | 新API＋旧桌面/网站 | 原认证、provider、支付调用兼容；新字段可忽略 |
| UPGRADE-02 | 新桌面＋旧backend/API | capability探测明确未支持，保留原功能，不fallback固定码 |

## D2：运行自动验收与原生桌面 QA

**Files:** 本阶段修改仅限修复已复现的问题、必要测试和交付文档。不要借验收全局重构无关UI/上游代码。

- [ ] **Step 1：API质量门禁。** 在 `/Users/zizimutou/Protect/Aino-API`：

```sh
make -C backend generate
make -C backend test
make -C backend test-unit
make -C backend test-integration
make -C backend build
pnpm --dir frontend run test:run
pnpm --dir frontend run lint:check
pnpm --dir frontend run typecheck
pnpm --dir frontend run build
```

`make test` 包含默认Go测试和golangci-lint，不能代替unit/integration tags。生成后`git diff`若出现非任务生成漂移，定位原因，不能直接一起提交。

- [ ] **Step 2：Aino质量门禁。** 在Aino根目录使用：

```sh
scripts/run_tests.sh tests/tui_gateway/ tests/agent/ tests/plugins/ tests/hermes_cli/
```

在 `apps/desktop`：

```sh
npm run test:ui
npm run test:desktop:platforms
npm run typecheck
npm run lint
npm run build
npx playwright test e2e/platform-account-model-billing.spec.ts
```

涉及通用模型解析/跨进程运行时后，按仓库CI分类执行必要更广范围检查；全Python suite如CI配置要求必须完成。基线已有失败用相同命令在未改基线验证，说明影响，不能篡改断言/skip。

- [ ] **Step 3：原生 QA。** 选真实Aino实例，开发时路径是 `/Users/zizimutou/Protect/Aino/apps/desktop/node_modules/electron/dist/Electron.app`，以窗口标题Aino和实际renderer确认；不要选Electron demo。图形交互工具优先，自动化测试也应launch这个应用产物。
- [ ] **Step 4：多平台实际差异。** macOS验证keychain/窗口尺寸，Windows验证凭据保护与重启，Linux验证secret storage backend；没跑的平台明确列未验证。不得patch sys.platform冒充通过。至少测试一份实际打包产物，不能仅dev热更新验收。
- [ ] **Step 5：修复与回归。** 每个问题确认因果、最小修复、相关行为测试；已有通过且未再改动区域不重复无限审查。保留本次最终测试输出摘要/日期/commit和截图。
- [ ] **Step 6：提交本阶段。** 建议 `test(platform): cover account model and payment lifecycle end to end`；具体修复独立提交，不混入巨型测试提交。

## D3：真实服务联调与生产发布准备

**Files:**

- API Create: `docs/aino-platform-deployment.md`、必要配置示例，凭据为空或引用服务端secret名称。
- Aino Create: `docs/aino-platform-user-guide.md`；Update `docs/desktop-account-auth.md`。
- API/Aino Update: 既有发布说明；如开发分支需新增CI，遵守现有分类和Action SHA pin规范。

**Interfaces:** 记录 `desktop_api_version`、最低Agent binding capability、API/desktop git SHA、镜像/安装包hash、migration文件和checksum。不能用产品版本0.2.4或0.21.1当精确构建证明。

- [ ] **Step 1：填写准确操作单。** 从实际实现导出所有sms/desktop配置名、模型组/allowlist/default、凭据来源、支付/协议配置和启动检查。解释可用但不启用、未配置、上游错误的区别。配置文档要能让另一人按步骤部署，不引用已经不存在的 `make migrate-up/down` 命令；当前迁移在service启动自动执行。
- [ ] **Step 2：确认部署制品对应同一配对版本。** 预发布使用生产配置的结构、隔离数据和测试渠道；测试旧DB升级，校验users/balance/identity/order完整性。实际缺少预发布服务时给出本地隔离启动方式和未完成线上项，不能猜SSH目标或直接改生产。
- [ ] **Step 3：收齐依赖材料后做有范围的真实实测。** 操作前已有明确接收号码、发送次数、模型调用预算、支付金额/账户和环境授权；不要从历史聊天密钥或其他目录找凭据。阿里云变量与模板正文逐字核对，Code受理和手机实际收到分别记录。电信待验证就保持该项未通过。
- [ ] **Step 4：真实完整闭环。** 至少一个受支持模型在授权账户完成文本/工具/流式与账本扣费；一次授权小额充值完成商户/订单/账本一致。退款测试沿用现有授权流程，不能在未授权情况下为“清理测试”擅自退款。逐模型真实测试结果决定目录可用能力，不把部分通过外推全部模型。
- [ ] **Step 5：分批上线顺序。**

```text
确认备份和可恢复版本
→ 发布向后兼容API与新迁移，所有新开关关闭
→ 配置短信/目录/授权组/协议及支付渠道
→ 仅授权测试账号开启phone/desktop，验证实际服务
→ 发布适配桌面或交付灰度安装包
→ 灰度注册与余额充值，核对成功率/错误/实际账本
→ 达到验收标准后扩大用户范围
```

如现有feature flags不支持按用户灰度，新增最小测试用户allowlist仅用于该功能，不自建通用实验平台。关闭全局registration仍允许已有phone用户登录；开放注册须同时通过协议、短信限额与身份事务验收。
- [ ] **Step 6：回退演练。** 按功能先关闭新注册/托管签发/充值入口，保留已有订单查询和支付回调履约；不要为了停充值直接停掉已支付订单的入账。撤销平台设备Key，客户端提示升级或暂不可用，BYOK继续原路径。保留DB新增数据；API仅回退到识别phone/新订单字段的兼容构建。恢复订单状态不得手工改余额绕过账本。
- [ ] **Step 7：记录授权与实际完成层级。** 尚未获生产权限时，交付构建产物＋操作单并标「待发布」，不要声称线上完成；已经获得具体上线授权则依清单执行到核验完成，普通后续动作不重复问确认。

## D4：Claude 交付报告与 Codex 最终复核

**Files:** Aino `docs/implementation/aino-platform-delivery.md`；报告模板如下，执行后必须替换为事实。空项不得写通过。

```markdown
# Aino 平台接入交付报告

## 版本与范围

| 仓库/部署 | 分支 | 基线 SHA | 最终 SHA / artifact hash |
| --- | --- | --- | --- |

说明每个阶段实际完成内容与设计差异，附差异原因。

## 自动验证

| 命令 | 环境 | 执行时间 | 对应 SHA | 通过/失败/跳过 | 报告位置 |
| --- | --- | --- | --- | --- | --- |

## 真实验证

| 项目 | 环境/范围 | 授权来源 | 结果 | 脱敏证据 | 尚未覆盖 |
| --- | --- | --- | --- | --- | --- |

## 兼容和迁移

列出新增迁移、旧数据升级结果、旧客户端结果、账号/余额/Key影响。

## 发布与回退

关联实际部署文档、配对制品、配置和已完成/未完成发布步骤。

## 未完成与风险

逐项列缺失的外部材料、未通过用例、未验证平台；说明能否发布及依据。
```

- [ ] **Step 1：检查差异与提交范围。** 两仓库 `git diff --check`、branch diff、status；本地含秘密文件不入Git，sample配置无真实密钥/手机号；lockfiles与生成物可解释。没有把未提交用户改动混进本任务。
- [x] **Step 2：对照矩阵写报告。** E18/E21/E22 核心原生、工作区及充值后双端均有耐久回执；E23 完整 UI 874 文件/7,979 项通过；E24 清理修复 `3517ccfd3b` 定向验证/独立复核通过；E25 最终开发构建、配对来源与 395 文件清单已记录。本轮新增 E26–E30，SQLite 修复、并发与断网／撤销恢复已有对应证据；报告区分广泛失败与后续定向关闭、各次开发构建与正式安装包。签名发行、其余原生／多平台及真实服务门禁仍未完成，不因报告完成而勾选整个 D。
- [ ] **Step 3：交付用户。** 给出两仓库分支/commit、阅读入口、安装包/启动方式、已完成与待联调项；有推送授权才推到自有origin，未授权只提供本地结果。
- [ ] **Step 4：Codex接手时检查以下实质问题。** 这一步是后续复核责任，不在没有执行结果时打勾通过。

| 复核重点 | 必看证据/红线 |
| --- | --- |
| 账户绑定 | server subject授权、phone唯一事务、TOTP/注册政策、不多发赠金、不自动钱包合并 |
| 生产验证码 | 非固定码、真实模板变量、三网证据、限流原子、Redis故障不绕过 |
| native秘密 | preload返回DTO、任意IPC调用、账户cache generation、安全持久化、日志/产物无Key |
| 推理权限 | 真实APIKey group/model gate、父session revoke、多连接授权和无秘密落盘 |
| 真实Agent | 首次无BYOK可启动、历史恢复正确、工具/stream/压缩/子任务齐全 |
| 计费来源 | aux/fallback无隐形平台扣费；用户B不沿用用户A租约 |
| 订单财务 | 持久client_order_id、未知结果恢复、签名/金额验证、最多一次入账、退款兼容 |
| 展示准确 | USD/CNY分开、PAID不冒充到账、未结算不显示0、界面模型与实际调用一致 |
| 原功能 | 原UI与项目/终端/摘要/BYOK不退化，未发送标题保持隐藏 |
| 发布 | 旧数据/客户端兼容、实际配对SHA、功能开关、回退不丢账本 |

Codex 应先读报告再按当前分支/提交范围复核，复现可疑问题再修复；已经稳定且未改动的UI不反复大范围检查。缺少真实服务证据时列为待验收，不能替 Claude 补写成功记录。
