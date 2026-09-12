# Aino 会话摘要侧栏设计规格

日期：2026-09-12

分支：`aino/ui-terminal-workspace`

## 目标

在 Aino 桌面端顶部工具栏增加一个“摘要”按钮。点击后，在现有右侧工作区中打开统一的摘要侧栏，集中展示当前会话和工作区的关键信息。摘要侧栏是当前聊天的辅助工作区，不改变现有布局树、不挤压聊天区、不复制业务逻辑，也不自动抢夺焦点。

摘要侧栏需要让用户快速回答四个问题：当前在哪个项目和模型上工作、有哪些代码/Git 变化、有哪些智能体或预览在运行、当前会话消耗了多少上下文和系统资源。

## 非目标

- 不重做现有 Git Review、文件树、终端、预览或 Agents 页面。
- 不新增后端 RPC；摘要只组合现有 renderer store、React Query 数据和 Electron/远程 Git facade。
- 不把摘要内容持久化为另一份会话事实；展示值始终来自现有权威数据源。
- 不在后台事件发生时自动打开侧栏、切换会话或移动焦点。

## 交互与布局

### 顶部入口

- 在 `titlebar-controls.tsx` 的静态工具组中增加 `summary` 工具，使用现有标题栏按钮、Tooltip、快捷键注册和图标规范。
- 工具的 active 状态由摘要侧栏是否打开决定；重复点击关闭侧栏。
- 入口沿用 `view.toggleRightSidebar` 的定位和 `triggerHaptic` 行为，不新增独立的浮层定位逻辑。

### 侧栏承载

- 摘要作为现有右侧栏的一个命名工作区挂载，复用右侧栏开关、宽度、翻转和窄窗口行为。
- 摘要打开时不修改 layout tree 的节点关系；聊天区仍是主表面，摘要只是右侧附属面板。
- 侧栏顶部提供标题、关闭按钮和当前状态标记。内容区域可滚动，单个分区使用平面分组和 hairline 分隔，遵循 `apps/desktop/DESIGN.md` 的 token/primitive 约束。
- 摘要与文件树、Review、预览、终端互斥显示于同一右侧工作区；切换工作区不销毁终端或预览的持久状态。

## 信息架构与数据源

摘要按以下顺序显示分区。每个分区只订阅自己需要的 store，避免整个 wiring 树因高频事件重渲染。

1. **环境**
   - 项目/工作目录：`$currentCwd`、`$workspaceCwdOwner`、当前已选会话。
   - 模型与连接：复用当前 gateway/profile/model store 和已有连接状态文案。
   - 没有项目时显示“未打开项目”，不发起文件系统或 Git 请求。
2. **代码变更**
   - 文件数量、增删行、查看 Diff、暂存、撤销等信息和操作复用 `ReviewPane`、`ship-bar.tsx` 与 `review.ts` 的查询和 action。
   - 操作按钮调用已有 review facade；成功后由现有 query/store 刷新，失败显示错误并保留当前摘要。
3. **Git 状态**
   - 分支、远程跟踪、最近提交、推送和 Pull Request 状态复用 `desktop-git.ts` 的 typed facade。
   - 本地模式和远程模式使用同一摘要组件；Git 不可用时展示明确的不可用状态和重试入口，不显示无限加载。
4. **子智能体**
   - 运行中、已完成、失败数量读取 `$subagents` 及现有 Agents 数据源。
   - 点击“查看全部”导航到既有 Agents 页面，不在侧栏中重建 Agents 列表。
5. **上下文用量**
   - 复用 `context-usage-panel.tsx` 的上下文百分比、已用/上限和现有格式化方法。
   - 数据缺失时显示“暂无数据”，不能以 0 伪装为有效统计。
6. **来源与预览**
   - 当前会话附件、预览产物和来源链接读取 `preview-status.ts` 及现有预览 registry。
   - 点击来源使用既有 `openPreview` 或链接行为；不因摘要渲染自动打开预览。
7. **系统资源**
   - 复用 `system-resources-settings.tsx` 使用的查询/格式化逻辑，展示 RAM、GPU/显存（存在时）和可用性。
   - 资源查询中显示延迟加载状态；查询失败提供重试，不阻塞其它分区。

## 状态与异常处理

摘要根部维护一个轻量的打开/关闭状态，数据状态留在各自的 query/store 中。所有分区都必须区分以下状态：

- **加载中**：使用短暂延迟后的统一 Loader/Skeleton，避免会话切换时闪烁。
- **无数据**：显示简短的空状态，说明当前没有项目、改动、子智能体或来源。
- **暂时不可用**：保留已知旧值（如有），标记“暂时不可用”并提供重试；禁止用空数组覆盖正在工作的缓存。
- **远程连接**：所有 Git/资源请求走已有远程 facade；不能读取本机项目目录作为远程结果。
- **Git 不可用**：环境和上下文分区仍正常显示，Git 分区只显示不可用和重试。
- **会话切换**：以选中会话/工作区作为 key 清理会话相关摘要，异步旧响应不得覆盖新会话。
- **侧栏关闭**：仅隐藏摘要内容，不清理终端、预览或 Git store；重新打开应恢复最新缓存。

## 组件与边界

建议新增以下局部模块，避免继续扩大 facade：

- `app/right-sidebar/summary/index.tsx`：侧栏壳、分区编排和关闭/导航动作。
- `app/right-sidebar/summary/summary-section.tsx`：统一标题、状态、空态和错误态的展示 primitive。
- `app/right-sidebar/summary/environment-section.tsx`
- `app/right-sidebar/summary/changes-section.tsx`
- `app/right-sidebar/summary/git-section.tsx`
- `app/right-sidebar/summary/agents-section.tsx`
- `app/right-sidebar/summary/context-section.tsx`
- `app/right-sidebar/summary/sources-section.tsx`
- `app/right-sidebar/summary/resources-section.tsx`

若复用逻辑需要抽取，应从原组件旁边提取纯 formatter/query hook，再由原组件和摘要共同调用；不通过读取源文件或复制 JSX 复用。摘要的开关状态可扩展现有右侧栏 pane/active-tab store；只有当现有 store 无法表达命名工作区时，才增加一个最小的 `RightRailWorkspaceId` 类型并保持持久化 key 作用域清晰。

## 国际化与无障碍

- 所有可见文案、状态、Tooltip、按钮和 aria-label 增加到 i18n 类型及中文 catalog；命令名和内部 id 保持英文。
- 分区使用正确的 heading 层级；摘要侧栏提供 `aria-label`，状态变化使用现有 live-region 约定，不把统计信息仅放在颜色或图标上。
- 图标沿用现有 `AinoDesignIcon`/`Codicon`/Lucide primitive；不在组件内绘制新的 SVG。

## 测试方案

### 单元与组件测试

- 标题栏摘要按钮：打开、关闭、active 状态、Tooltip/快捷键和窄窗口行为。
- 摘要分区：环境/无项目、Git 无改动、Git 不可用、上下文缺失、资源查询失败、子智能体计数和来源点击。
- 异步竞态：会话切换后旧 Git/资源响应不能覆盖新会话；错误后重试可恢复。
- 操作回归：暂存、撤销、推送等摘要按钮调用既有 review facade，不复制或绕过权限/远程分支。

### 验收命令

在仓库根目录使用项目规定的 runner：

```bash
scripts/run_tests.sh apps/desktop/src/app/shell/titlebar-controls.test.tsx
cd apps/desktop && npx vitest run src/app/right-sidebar/summary src/app/shell/titlebar-controls.test.tsx
cd apps/desktop && npx tsc --noEmit
```

完成后启动桌面端，分别验证本地有项目/无项目、Git 有改动/无改动、远程连接、摘要打开关闭和右侧栏翻转；确认摘要不挤压聊天区，终端和预览隐藏后再次打开仍保留状态。

## 验收标准

- 顶部按钮能稳定打开/关闭统一摘要侧栏，且与现有右侧栏宽度、翻转和键盘行为一致。
- 七个信息分区均使用已有真实数据源；没有硬编码模型、项目、Git 结果或假统计。
- 任意单个分区失败不影响其它分区，所有加载态都有明确终态和重试/返回路径。
- 远程会话不会误读本机文件系统；会话切换不会显示上一个会话的数据。
- 现有聊天、文件、Review、终端、预览、Agents 功能和快捷键保持原行为。
- 中文 catalog、类型检查、相关 Vitest 和桌面端启动验收通过。
