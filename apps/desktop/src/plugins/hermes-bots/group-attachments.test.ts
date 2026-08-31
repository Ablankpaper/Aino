import { beforeEach, describe, expect, it, vi } from 'vitest'

const { hostMock, i18nMock } = vi.hoisted(() => ({
  hostMock: { notify: vi.fn() },
  i18nMock: { t: vi.fn((key: string) => key) }
}))

vi.mock('@hermes/plugin-sdk', () => ({ host: hostMock }))

vi.mock('./shared', () => ({
  getPluginCtx: () => ({ i18n: i18nMock })
}))

beforeEach(() => {
  vi.clearAllMocks()
  i18nMock.t.mockImplementation((key: string) => key)
})

describe('group attachment limits', () => {
  it('uses the active Simplified Chinese bundle for oversized-file notices', async () => {
    i18nMock.t.mockImplementation((key: string, ...args: unknown[]) =>
      key === 'group.attachmentTooLarge' ? `${String(args[0])}：文件过大（最大 15MB）。` : key
    )

    const { filesToGroupAttachments } = await import('./group-attachments')
    const file = new File([new Uint8Array(15_000_001)], '报告.pdf', { type: 'application/pdf' })

    expect(await filesToGroupAttachments([file])).toEqual([])
    expect(hostMock.notify).toHaveBeenCalledWith({
      kind: 'error',
      message: '报告.pdf：文件过大（最大 15MB）。'
    })
  })
})
