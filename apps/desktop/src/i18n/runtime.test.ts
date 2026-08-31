import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { fieldCopyForSchemaKey } from '@/app/settings/field-copy'

import { TRANSLATIONS } from './catalog'
import { setRuntimeI18nLocale, translateNow } from './runtime'
import { zh } from './zh'

describe('desktop i18n runtime translator', () => {
  beforeEach(() => {
    setRuntimeI18nLocale('en')
  })

  afterEach(() => {
    setRuntimeI18nLocale('en')
  })

  it('translates string paths for the active runtime locale', () => {
    setRuntimeI18nLocale('zh')

    expect(translateNow('boot.ready')).toBe('Aino 桌面版已就绪')
    expect(translateNow('boot.errors.gatewayConnectionLostDetail')).toBe(
      '仍在后台重试。你可以继续阅读和撰写草稿；如果问题持续，请打开网关设置。'
    )
    expect(translateNow('notifications.voice.noSpeechDetected')).toBe('没有检测到语音')
    expect(translateNow('composer.lookupNoMatches')).toBe('没有匹配项。')
    expect(translateNow('assistant.tool.statusRecovered')).toBe('已恢复')
  })

  it('resolves Chinese copy for shared chat, accessibility, and quick entry affordances', () => {
    setRuntimeI18nLocale('zh')

    expect(translateNow('ui.actions.addContext')).toBe('添加上下文')
    expect(translateNow('ui.actions.filters')).toBe('筛选')
    expect(translateNow('ui.accessibility.showOptions')).toBe('显示选项')
    expect(translateNow('ui.accessibility.openFullView')).toBe('打开完整视图')
    expect(translateNow('ui.accessibility.zoomOut')).toBe('缩小')
    expect(translateNow('ui.accessibility.resetZoom')).toBe('重置缩放')
    expect(translateNow('ui.accessibility.zoomIn')).toBe('放大')
    expect(translateNow('ui.accessibility.generatedImage')).toBe('生成的图片')
    expect(translateNow('assistant.thread.showMessage')).toBe('显示消息')
    expect(translateNow('desktop.quickEntry.currentChat')).toBe('当前对话')
    expect(translateNow('desktop.quickEntry.newSession')).toBe('新建会话')
  })

  it('localizes desktop bridge refusal messages', () => {
    setRuntimeI18nLocale('zh')

    expect(translateNow('preview.drive.inactiveSession')).toBe('应用内浏览器操作只能在你当前查看的会话中执行。')
    expect(translateNow('preview.tour.disabled')).toBe('你已关闭引导导览。')
    expect(translateNow('preview.tour.inactiveSession')).toBe('引导导览只能在你当前查看的会话中运行。')
  })

  it('passes arguments to function translations', () => {
    expect(translateNow('notifications.updateReadyMessage', 2)).toBe('2 new changes available.')
  })

  it('translates migrated overlap keys for newly supported locales', () => {
    setRuntimeI18nLocale('ja')
    expect(translateNow('common.save')).toBe('保存')

    setRuntimeI18nLocale('zh-hant')
    expect(translateNow('cron.promptPlaceholder')).toBe('代理每次執行時應做什麼？')
  })

  it('translates settings copy for newly supported locales', () => {
    setRuntimeI18nLocale('ja')
    expect(translateNow('settings.appearance.title')).toBe('外観')
    expect(translateNow('settings.nav.providers')).toBe('プロバイダー')

    setRuntimeI18nLocale('zh-hant')
    expect(translateNow('settings.appearance.title')).toBe('外觀')
    expect(translateNow('settings.nav.providerApiKeys')).toBe('API 金鑰')

    setRuntimeI18nLocale('ar')
    expect(translateNow('settings.appearance.reasoningCollapsedTitle')).toBe('طي التفكير افتراضيًا')
    expect(translateNow('settings.appearance.reasoningCollapsedDesc')).toBe(
      'أبقِ التفكير المتدفق متاحًا دون توسيعه حتى تفتحه.'
    )
  })

  it('keeps translated settings field copy addressable from schema keys', () => {
    const field = ['display', 'show_reasoning'].join('.')

    expect(fieldCopyForSchemaKey(zh.settings.fieldLabels, field)).toBe('推理过程块')
    expect(fieldCopyForSchemaKey(zh.settings.fieldDescriptions, field)).toBe('当后端提供推理内容时予以显示。')
  })

  it('exposes Chinese copy for settings and lifecycle flows', () => {
    setRuntimeI18nLocale('zh')

    expect(translateNow('settings.customEndpoints.emptyTitle')).toBe('暂无自定义端点')
    expect(translateNow('settings.customEndpoints.emptyDescription')).toBe('在下方添加一个 OpenAI 兼容端点。')
    expect(translateNow('settings.providers.descriptions.DeepSeek')).toBe('DeepSeek 直连接口（V3.x、R1）。')
    expect(translateNow('settings.computerUse.ready')).toBe('已就绪')
    expect(translateNow('settings.uninstall.dangerZone')).toBe('危险区域')
    expect(translateNow('settings.appearance.themeSearchPlaceholder')).toBe('搜索你的主题或 VS Code Marketplace…')
    expect(translateNow('onboarding.runtimeNotReadyTitle')).toBe('运行时未就绪')
    expect(translateNow('updates.desktopBridgeUnavailable')).toBe('桌面桥接不可用。')
    expect(translateNow('updates.starting')).toBe('正在开始更新…')
    expect(translateNow('updates.backendApplied')).toBe('后端更新已应用。')
    expect(translateNow('updates.backendNoReturn')).toBe('后端未恢复在线。')
  })

  it('keeps gateway and provider status copy fully localized', () => {
    setRuntimeI18nLocale('zh')

    expect(translateNow('settings.managedUpdates.scopeNotRestored', '工作', '连接失败')).toBe(
      '配置档案“工作”未恢复：连接失败'
    )
    expect(translateNow('settings.providers.removeKeyManaged', 'OpenAI')).toBe(
      'OpenAI 由 API 密钥配置。请从 API 密钥中移除。'
    )
    expect(translateNow('shell.statusbar.connectionRemoteTooltip', 'server.example')).toBe(
      '远程 · server.example'
    )
  })

  it('localizes gateway setup terminology while preserving technical values', () => {
    setRuntimeI18nLocale('zh')

    expect(translateNow('settings.managedUpdates.scopesRestored', '工作、个人')).toBe('已恢复的配置档案：工作、个人')
    expect(translateNow('settings.managedUpdates.progress')).toBe('正在排空会话、更新远端安装并恢复配置档案…')
    expect(translateNow('settings.gateway.remoteUrlDesc')).toBe(
      '远程仪表盘后端的基础 URL。支持路径前缀，例如 /hermes。'
    )
    expect(translateNow('settings.gateway.tokenTitle')).toBe('会话令牌')
    expect(translateNow('settings.gateway.tokenDesc')).toBe(
      '用于 REST 和 WebSocket 访问的仪表盘会话令牌。留空则保留已保存的令牌。'
    )
  })

  it('keeps gateway authentication and profile guidance in Simplified Chinese', () => {
    setRuntimeI18nLocale('zh')

    expect(translateNow('settings.gateway.remoteAuthHint')).toBe(
      '托管网关使用 OAuth 或用户名密码；自托管网关也可能使用会话令牌。'
    )
    expect(translateNow('settings.gateway.plainTextConfirmTitle')).toBe('以明文存储网关令牌？')
    expect(translateNow('settings.gateway.incompleteToken')).toBe('切换到远程前，请输入远程 URL 和会话令牌。')
    expect(translateNow('settings.gateway.restartingMessage')).toBe(
      'Aino 桌面端将使用已保存设置重新连接（界面保持打开）。'
    )
    expect(translateNow('settings.gateway.sshErrUpdateRequired')).toBe(
      '使用桌面端 SSH 连接前，请更新远程主机上的 Aino。'
    )
    expect(translateNow('settings.profileScope.editsProfile', '工作')).toBe('此页面的更改将应用于“工作”配置档案。')
  })

  it('falls back to English when the active locale cannot resolve a key', () => {
    const boot = TRANSLATIONS.ja.boot as { ready?: string }
    const originalReady = boot.ready

    try {
      boot.ready = undefined
      setRuntimeI18nLocale('ja')

      expect(translateNow('boot.ready')).toBe('Aino is ready')
    } finally {
      boot.ready = originalReady
    }
  })

  it('returns the key when no locale can resolve a path', () => {
    setRuntimeI18nLocale('zh')

    expect(translateNow('missing.path')).toBe('missing.path')
  })
})
