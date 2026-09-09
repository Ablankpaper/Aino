import { describe, expect, it } from 'vitest'

import { en } from './en'
import { localizedPreviewError } from './preview-errors'
import { zh } from './zh'

describe('localizedPreviewError', () => {
  it('translates fixed desktop preview errors while retaining unknown diagnostics', () => {
    expect(localizedPreviewError(zh, new Error('Invalid PDF file header'))).toBe('PDF 文件头无效。')
    expect(localizedPreviewError(zh, 'Desktop bridge unavailable')).toBe('桌面桥接不可用')
    expect(localizedPreviewError(zh, new Error('Desktop preview browser bridge is unavailable'))).toBe('桌面桥接不可用')
    expect(localizedPreviewError(zh, new Error('Desktop preview buffer bridge is unavailable'))).toBe('桌面桥接不可用')
    expect(localizedPreviewError(zh, new Error('Remote HTML preview could not be loaded'))).toBe('预览不可用')
    expect(localizedPreviewError(zh, new Error('Could not stage remote HTML preview'))).toBe('无法写入产物文件。')
    expect(localizedPreviewError(zh, new Error('Could not open preview target: /work/demo.html'))).toBe(
      '无法打开预览目标：/work/demo.html'
    )
    expect(localizedPreviewError(zh, new Error('File preview failed: permission denied'))).toBe(
      'File preview failed: permission denied'
    )
  })

  it('keeps the English error contract unchanged', () => {
    expect(localizedPreviewError(en, new Error('Invalid PDF data URL type'))).toBe('Invalid PDF data URL type')
    expect(localizedPreviewError(en, 'preview webview is not ready')).toBe('preview webview is not ready')
    expect(localizedPreviewError(en, new Error('Could not open preview target: /work/demo.html'))).toBe(
      'Could not open preview target: /work/demo.html'
    )
  })
})
