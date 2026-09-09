import type { TerminalBackendInfo } from '@/types/hermes'

import type { Locale } from './types'

interface TerminalBackendCopy {
  description: string
  label: string
}

/** Chinese copy for the built-in terminal backend rows returned by the API. */
const ZH_BACKEND_COPY: Readonly<Record<string, TerminalBackendCopy>> = {
  local: {
    label: '本地',
    description: '直接在此机器上运行命令，不提供隔离。'
  },
  docker: {
    label: 'Docker',
    description: '在隔离的 Docker 容器中运行命令，并使用持久化工作区。'
  },
  singularity: {
    label: 'Singularity / Apptainer',
    description: '在 Singularity/Apptainer 容器中运行命令（适合 HPC，无需 root 权限）。'
  },
  modal: {
    label: 'Modal',
    description: '在 Modal 云端沙箱中运行命令。'
  },
  daytona: {
    label: 'Daytona',
    description: '在 Daytona 云端沙箱中运行命令。'
  },
  ssh: {
    label: 'SSH',
    description: '通过 SSH 在远程主机上运行命令。'
  }
}

const ZH_DETAIL_COPY: Readonly<Record<string, string>> = {
  'Docker CLI not found — install Docker Desktop or docker-ce.':
    '未找到 Docker CLI——请安装 Docker Desktop 或 docker-ce。',
  'Docker daemon not reachable — start Docker and retry.': 'Docker 守护进程无法连接——请启动 Docker 后重试。',
  'Docker daemon not responding (timed out).': 'Docker 守护进程无响应（请求超时）。',
  'Neither singularity nor apptainer found on PATH.': 'PATH 中未找到 singularity 或 apptainer。',
  'Modal credentials not found — set MODAL_TOKEN_ID and MODAL_TOKEN_SECRET (or run `modal setup`).':
    '未找到 Modal 凭据——请设置 MODAL_TOKEN_ID 和 MODAL_TOKEN_SECRET（或运行 `modal setup`）。',
  'Set DAYTONA_API_KEY to use the Daytona backend.': '请设置 DAYTONA_API_KEY 以使用 Daytona 后端。'
}

function localizeDetail(detail: string): string {
  const exact = ZH_DETAIL_COPY[detail]

  if (exact) {
    return exact
  }

  const sshMatch = /^Set (.+) in config\.yaml \(or the matching TERMINAL_SSH_\* env vars\.\)$/.exec(detail)

  if (sshMatch) {
    return `请在 config.yaml 中设置 ${sshMatch[1]}（或对应的 TERMINAL_SSH_* 环境变量）。`
  }

  return detail
}

/**
 * Resolve display-only metadata for a terminal backend.
 *
 * The API is allowed to add plugin rows and backend-specific diagnostics. Only
 * stable built-in names are translated; unknown rows and dynamic host/error
 * details stay exactly as supplied by their owner.
 */
export function localizedTerminalBackendMetadata(locale: Locale, backend: TerminalBackendInfo): TerminalBackendInfo {
  if (locale !== 'zh') {
    return backend
  }

  const copy = ZH_BACKEND_COPY[backend.name]

  return {
    ...backend,
    ...(copy ?? {}),
    detail: localizeDetail(backend.detail)
  }
}
