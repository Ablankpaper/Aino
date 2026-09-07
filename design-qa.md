# Aino 全界面风格统一验收

日期：2026-09-07。范围为 Aino 自有桌面界面，不改变功能、命令、后端或用户数据。

final result: passed

## 视觉基准与比较条件

- 基准：`/var/folders/d8/tb_9ybdj5xzg_l5451f5209c0000gn/T/codex-clipboard-202be674-6328-40f7-94ae-9e0ed3b649c1.png`
  和 `/var/folders/d8/tb_9ybdj5xzg_l5451f5209c0000gn/T/codex-clipboard-3de11f46-f1ac-4fcf-8a3d-6ab673468fc2.png`。
- 基准图片为 2746×1766 px，按 2× 密度归一到 1373×883 CSS px。
- 实现：本项目实际 Electron renderer，`http://127.0.0.1:5174/`，窗口标题 Aino；
  使用独立临时用户目录、独立 HERMES_HOME 和本地 mock inference。
- 主窗口截图为 2746×1766 px /1373×883 CSS px /DPR 2；另检查 760×760、420×740 CSS px。
- 明亮默认主题与基准比较，另外验证暗色、自定义主题与 Glass。
- 主要实现截图：`/tmp/aino-ui-qa.dd7oKd/chat-final.png`、`settings-final.png`。
  设置页短标签的最终修正另见
  `apps/desktop/test-results/settings-appearance-keeps--5d7c0-beside-its-settings-control/settings-label.png`。
- 同一比较输入：`/tmp/aino-ui-qa.dd7oKd/reference-comparison.jpg`。
- 局部放大比较：`/tmp/aino-ui-qa.dd7oKd/compare-sidebar.png`、`compare-composer.png`。
- 隔离环境的会话文字、会话数量、模型名称及项目关联与用户截图不同。这些动态内容不复制，
  不据此计算或宣称整图像素误差为零；比较的是已确认的字体、布局节奏和共享组件风格。

## 五项视觉核对

| 项目 | 结果 |
| --- | --- |
| 字体和层级 | 聊天、设置、菜单、辅助窗口统一使用主题 sans 字体；默认中文优先 PingFang SC。常规 UI 13px，辅助信息 12px，正文/标题各有层级。工具提示不再强制 Arial。代码、路径、终端保留等宽字体。 |
| 间距和布局 | 保持基准聊天的侧栏、正文和停靠输入框；其他页面保留适合自身任务的布局。共享控件 8px、选中行 10px、浮层 16px 圆角。420px 下聊天输入框完整，设置切换为横向导航，主文档无横向溢出。 |
| 颜色和状态 | 白色主面、浅灰侧栏/表单、石墨色主操作、轻描边和阴影。选中/悬停/键盘焦点统一；错误、警告、成功和差异高亮保留语义颜色。自定义主题保留用户选色。 |
| 图像与图标 | 保留现有 Aino 图标和设计资源，使用项目已有图标库；没有用临时图形替换品牌素材。桌宠使用既有渲染器，验收时使用仓库自带图片作为测试内容，未改用户宠物或资源。 |
| 文案与功能 | 保留原有中文界面与全部原有入口、按钮回调和状态链。命令、API 名称、模型 ID、路径不翻译；未加入固定身份回答或提示词修改。 |

## 覆盖记录

截图目录均为 `/tmp/aino-ui-qa.dd7oKd/`；联系图用于横向检查，重要控件另打开原尺寸截图检查。

| 界面组 | 证据与验收方式 |
| --- | --- |
| 聊天与首页 | `chat-final.png`、`reference-comparison.jpg`；真实隔离后端发送/响应，消息操作、停靠输入框、停止/插话/排队/澄清由 Electron E2E 验证。 |
| 设置全部标签 | 18 个标签逐一打开：模型、对话、外观、工作区、安全、浏览器、记忆与上下文、语音、高级、通知、账单、提供方、网关、快捷键、工具与密钥、插件、归档、关于。`settings-contact.jpg`、`settings-final.png`。 |
| 其他主页面/任务浮层 | 技能、消息平台、产物、定时任务、工作区、智能体、星图、Webhook、命令中心；`routes-contact.jpg`。列表、空态、表单与关闭入口共用主题。 |
| 弹出界面 | `command-palette.png`、`model-picker.png`、`confirm.png`、`notifications.png`、`updates.png`、`updates-error.png`。打开/关闭、Escape、表单焦点、警告和成功提示已检查。更新错误由隔离 UI 状态驱动，未实际安装更新。 |
| 文件/审查/终端/浏览器 | `files-pane.png`、`file-preview.png`、`review-pane.png`、`browser-pane.png`；检查 Aino 外框、工具栏、列表和空/不支持预览态。终端保持挂载与分栏拖动由 E2E 验证；文件内容/差异/终端输出没有重绘成普通 UI 文本。 |
| 浏览器和会话弹出窗口 | `browser-popout.png`、`session-popout.png`；通过生产 IPC 创建实际窗口并等待内容绘制，检查正常空白浏览器提示与已有会话/输入框。 |
| HUD | `hud-focused-before.png`、`hud-recent-before.png`、`hud-recent-after.png`；新增真实 Electron 回归验证焦点、失焦短暂停留、衬底可见、空闲收起与 passive 衬底。 |
| 快捷输入 | `quick-entry-light.png`；用生产 quick renderer 和现有 preload 在 560×156 CSS px 的隔离窗口验证输入、目标选项与原生 select 焦点。面板未裁切。OS 全局热键未通过 CUA 实际触发；原热键代码未修改，既有 reducer/bridge 测试通过。 |
| 桌宠与语音提示 | `pet-composer.png`、`wake-dark.png`、`wake-light.png`；真实 pet/wake 窗口，桌宠输入打开/Escape 收起、浮层布局，wake 状态切换与跨窗口主题跟随。未开启真实麦克风或发送模型消息。 |
| 内置插件 | `kanban.png`、`kanban-new-task.png`、`bots-roster.png`、`bots-create.png`；隔离环境启用既有插件，实际页面和新建表单打开/取消；贡献页面、对话框沿用共享 UI。未创建或派发任务。 |
| 安装/启动/恢复 | `lifecycle-contact.jpg`，及 `apps/desktop/test-results/` 中的 onboarding/boot-failure 截图。E2E 覆盖首次启动、无提供方和后端失败；安装、重认证、根错误边界等其余条件入口经共享组件/主题源码审计，未执行真实安装、卸载或账号登录。 |
| 引导导览 | `tour-glass.png`；实际打开 tour，Glass 开启时卡片仍为不透明 paper，箭头同色，Escape 正常关闭。 |
| 暗色/窄窗/自定义 | `chat-dark.png`、`settings-dark.png`、`settings-custom.png`、`chat-760.png`、`chat-420.png`、`settings-420-loaded.png`。极窄宽度允许说明和短标签自然换行，没有移除操作。 |

## 发现、修复与复验历史

1. **P2，HUD 失焦后文字没有衬底。** 实测 recent transcript opacity=1，sheet opacity=0，
   深色桌面上文字失去对比度。修复为纸面与既有 recent/held 状态一起显示，保留点击穿透、
   原生 frost 和计时规则。新增 HUD E2E 先准确失败，再通过；前后截图见 HUD 记录。
2. **P2，辅助窗口错误采用默认工作区主题。** 实际 wake 窗口将 `qa-dark/midnight/dark`
   变成 `default/nous/light`，并覆盖记忆的活动工作区。新增明确的 auxiliary provider 模式，
   Quick Entry/pet/wake 跟随主题但不发布网关/原生主题所有权。真实 provider 测试 RED→GREEN；
   实际 wake 保持 qa-dark/midnight/dark，随后通过存储事件变为 light，工作区不变。
3. **P2，导览纸面在 Glass 下透明。** 复核发现字段背景别名不适合浮层；卡片及四向箭头改用
   `--ui-bg-elevated`。实际 Glass 模式测得 `rgb(255,255,255)`，截图和 Escape 复验通过。
4. **P3，局部样式和文档漂移。** 工具提示改回共享字体；tour 的纸面、阴影和说明统一；
   Badge 默认样式说明改为中性填充。独立复核确认全部意见已解决。

5. **P2，模型设置短标签挤压换行。** 最终原尺寸复核发现“推理”在宽窗口也被相邻全宽选择器
   挤成两行。为推理、快速模式的控件行补充不拆行约束，不改变选择器或开关行为。
   新增真实中文设置 E2E，测量文本 Range 行数：修复前为 2 行而失败，修复后为 1 行并通过
   （8.6s）。原尺寸截图确认“推理”和选择器正常横向对齐。

独立代码复核意见与最终视觉检查发现均已解决并复验。

## 最终自动验证

| 命令/检查 | 最新结果 |
| --- | --- |
| `npm run test:ui` | 758 文件 /7155 测试通过，95.28s |
| `npm run test:desktop:platforms` | 143 文件通过、2 跳过；2006 测试通过、6 跳过，5.59s |
| `npm run typecheck` | renderer、Electron、E2E 三项目通过 |
| `npx eslint src/ electron/ --quiet` | 无错误 |
| `npm run build` | 最后标签修正后再次通过，Vite 10.87s；Electron 主进程/preload 和 native deps 输出通过检查 |
| Playwright chat/onboarding/boot-failure/right-pane/context-menu-editables/hud-appearance | 15 测试通过，1.1m |
| Playwright settings-appearance | 1 测试通过，8.6s；验证中文短标签与真实选择器布局 |
| Vitest model-settings | 最后标签修正后 22 测试通过，2.30s |
| `git diff --check` | 通过 |

全量 UI、Electron 与上述 15 项 E2E 在最后两处不换行样式修正前通过；修正后重跑模型设置测试、
新增真实窗口布局回归、三个项目类型检查、完整 lint、构建及 diff 检查，全部通过。

测试中的现有 npm/Vite 废弃配置提醒、jsdom canvas 提醒，以及用于失败场景的临时仓库日志不代表测试失败。
无已提交视觉基线，E2E 自动截图不是像素匹配证明；本记录另有归一化基准和人工图像比较。

## 环境与边界

- Browser plugin 不可用；按前端验收技能使用项目 Playwright/Electron 流程，同时用 CUA 定位实际 Aino 窗口。
  使用完整项目 Electron 路径，未选择通用 Electron Demo。
- 主页面 identity、非空白、无框架错误遮罩、控制台错误、截图与交互证据均通过。
  隔离 QA 主 renderer 收集的 `pageerror` 为零。首次导航被 reload 中止及个别自动化定位超时均为验收脚本状态，未作为应用错误隐藏。
- 隔离 QA 窗口已关闭，正常开发桌面已启动并保持打开。最终 CUA 再次以项目 Electron 完整路径核对：
  窗口标题 Aino、页面 `127.0.0.1:5174`、原有真实工作区及会话。聊天、输入框、审查和文件栏正常绘制，
  未点击发送、提交或改变用户设置；原有输入草稿保留。
- 视觉实机平台为当前 macOS。Windows/Linux 的代码测试通过，但未在那些系统上进行屏幕实测。
- 第三方网页/iframe、用户产物、代码/终端内容和 OS 原生弹窗不改内容；其 Aino 自有外围 UI 已纳入统一。
- 本次仅保留本地工作区修改，没有提交或推送；原有未提交改动及无关临时目录保持不动。

## 完成清单

- [x] 根主题覆盖页面、portals 和独立 renderer。
- [x] 共享控件/表单/浮层与聊天风格统一。
- [x] 原有动作、状态、键盘交互和语义输出保留。
- [x] 跨界面、暗色、Glass 和窄窗口复核。
- [x] 所有复核问题修复并验证。
- [x] 完整测试、类型、lint、构建与 diff 检查。
