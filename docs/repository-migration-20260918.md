# GitHub 仓库迁移记录

2026-09-18，Aino 和 Aino-API 通过 GitHub 原生所有权转移，从 Ablankpaper 迁至 OneWhitepaper。后续开发、Issue、PR、发布与推送使用以下地址：

| 项目 | 唯一自有仓库 | 转移前后不变的 GitHub 仓库 ID |
| --- | --- | --- |
| Aino | <https://github.com/OneWhitepaper/Aino> | `1351320157` |
| Aino-API | <https://github.com/OneWhitepaper/Aino-API> | `1369313865` |

## 完整性与配置

- 转移完成时，Aino 的 49 条 Git 引用逐项一致：32 个分支、2 个标签、14 个 PR 引用和 HEAD；Aino-API 的两个分支与 HEAD 共 3 条引用逐项一致。后续迁移地址提交会正常推进活动分支，不重写历史。
- Aino 原有 8 个 PR（其中 6 个开放）、Aino-API 无 PR；两个仓库当时均无 Releases。历史证据仍归属原运行版本，不改写提交、作者或历史验收回执。
- 本地 `origin` 和 `gh` 默认仓库均改为新账号；默认推送为 `origin`。NousResearch/hermes-agent 和 Wei-Shaw/sub2api 保留为只拉取的上游。
- 命令行已登录 OneWhitepaper，并核实其对两个仓库均有管理员权限。
- 迁移后发现两仓库原本启用的 secret scanning 和 push protection 被关闭，已恢复为 enabled。其余安全功能按原配置保留。
- GitHub 的旧仓库 URL 保留重定向，便于历史链接和旧克隆继续定位同一个仓库；后续配置以新地址为准。

## 源码地址变更

Aino 桌面的统一品牌仓库地址、package repository、bootstrap 安装器默认 raw 地址和当前文档链接已更新。既有应用 ID、协议、用户数据位置及历史版权/作者记录保留，避免把账号迁移变成已安装应用的身份变更。

相关验证：桌面产品身份与 bootstrap 21 项、官方 Python runner 的 banner 9 项、Rust 安装脚本 12 项通过。初次 JS 依赖路径准备失败及 Rust lockfile 准备失败有本地日志留存，最终检查使用既有依赖和 CI 对应的 lib test 流程；不将这些定向测试视为正式安装包验收。

Aino-API 的受控源码在 main 和业务分支均未引用旧账号，不需要批量改写代码。它已有的 Sub2API 安装、更新和容器发布通道属于独立的发行配置：当前无 Aino-API Release，不能把地址机械替换为尚不存在的发行制品。本次未发布软件、部署服务或迁移无关账号级容器包。

迁移前后清单及日志留存在本机 `/private/tmp/aino-owner-migration-g8m_139r/`，原生所有权转移由仓库 ID、分支/标签 SHA 和新账号权限共同核验。历史 Actions/PR 链接可继续使用 GitHub 重定向；它们不是新的旧账号依赖。
