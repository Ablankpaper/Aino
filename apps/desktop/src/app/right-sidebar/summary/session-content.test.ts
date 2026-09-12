import { describe, expect, it } from 'vitest'

import { summaryHistoryContent, summaryOutputs } from './session-content'

describe('session summary resources', () => {
  it('separates supplied material from generated outputs and deduplicates references across turns', () => {
    const input = '/workspace/reference image.png'
    const output = '/workspace/report.pdf'

    const content = summaryHistoryContent('stored', [
      { role: 'user', content: `Read @image:\`${input}\` and @file:/workspace/notes.md` },
      { role: 'tool', tool_name: 'document_export', content: JSON.stringify({ output_path: output }) },
      { role: 'assistant', content: `Created [report](${output}).` },
      { role: 'user', content: `Use @image:\`${input}\` again.` },
      { role: 'tool', tool_name: 'mcp__figma__read', content: 'Design context' },
      { role: 'tool', tool_name: 'mcp__figma__export', content: 'Done' },
      {
        role: 'tool',
        tool_name: 'web_search',
        content: JSON.stringify({ data: { web: [{ title: 'Reference', url: 'https://example.com/reference' }] } })
      },
      {
        role: 'assistant',
        content:
          'Source: [Reference](https://example.com/reference), @file:/workspace/notes.md [Spec](/workspace/spec.pdf) ![Reference image](/workspace/spec.png)'
      }
    ])

    expect(content.outputs.map(item => item.target)).toEqual([output])
    expect(content.sources.map(item => item.target)).toEqual([
      input,
      '/workspace/notes.md',
      'figma',
      'https://example.com/reference',
      '/workspace/spec.png',
      '/workspace/spec.pdf'
    ])
    expect(content.sources.every(item => item.target !== output)).toBe(true)
  })

  it('keeps historical outputs beyond the small live preview feed and never adds another session implicitly', () => {
    const historical = summaryHistoryContent(
      'stored',
      Array.from({ length: 7 }, (_, index) => ({
        role: 'tool' as const,
        tool_name: 'document_export',
        content: JSON.stringify({ output_path: `/workspace/report-${index}.pdf` })
      }))
    ).outputs

    const current = {
      cwd: '/workspace',
      generated: true,
      id: historical[0].target,
      target: historical[0].target,
      label: 'Current report'
    }

    const outputs = summaryOutputs(historical, [], [current])

    expect(new Set(outputs.map(item => item.target)).size).toBe(historical.length)
    expect(outputs[0].label).toBe(current.label)
    expect(summaryOutputs([], [], [])).toEqual([])
  })

  it('retains explicitly delivered media without treating every assistant file reference as generated', () => {
    const content = summaryHistoryContent('stored', [
      { role: 'tool', tool_name: 'write_file', content: JSON.stringify({ path: '/workspace/index.html' }) },
      { role: 'assistant', content: 'MEDIA:/workspace/chart.png Reference: [data](/workspace/data.csv)' }
    ])

    expect(content.outputs.map(item => item.target)).toEqual(['/workspace/index.html', '/workspace/chart.png'])
    expect(content.sources.map(item => item.target)).toEqual(['/workspace/data.csv'])
  })
})
