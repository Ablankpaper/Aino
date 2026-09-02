import path from 'node:path'

import identity from '../brand.json'

export const PRODUCT_NAME = identity.productName
/** Pre-brand package name kept only for migration/discovery fallbacks. */
export const LEGACY_PRODUCT_NAME = 'Hermes'
export const AGENT_NAME = identity.agentName
export const COMPANY_NAME = identity.companyName
export const LEGAL_COPYRIGHT = identity.legalCopyright
export const APP_ID = identity.appId
export const HOME_DIR_NAME = identity.homeDirName
export const PRIMARY_PROTOCOL = identity.primaryProtocol
export const LEGACY_PROTOCOL = identity.legacyProtocol
export const REPOSITORY_URL = identity.repositoryUrl
export const UPSTREAM_REPOSITORY_URL = identity.upstreamRepositoryUrl
export const REPOSITORY_PATH = REPOSITORY_URL.replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '')
export const REPOSITORY_SSH_URL = `git@github.com:${REPOSITORY_PATH.replace(/\.git$/, '')}.git`

const LEGACY_HOME_DIR_NAME = 'hermes'

export interface AgentHomePathOptions {
  platform: string
  homeDir: string
  localAppData?: string
}

function agentHomePathForName({ platform, homeDir, localAppData }: AgentHomePathOptions, dirName: string): string {
  const pathModule = platform === 'win32' ? path.win32 : path.posix

  if (platform === 'win32' && localAppData) {
    return pathModule.join(localAppData, dirName)
  }

  return pathModule.join(homeDir, `.${dirName}`)
}

/** Resolve the default Aino agent data root for a host platform. */
export function defaultAgentHomePath(options: AgentHomePathOptions): string {
  return agentHomePathForName(options, HOME_DIR_NAME)
}

/** Resolve the pre-brand Hermes agent data root for migration probing. */
export function legacyAgentHomePath(options: AgentHomePathOptions): string {
  return agentHomePathForName(options, LEGACY_HOME_DIR_NAME)
}

export interface AgentHomeResolutionOptions extends AgentHomePathOptions {
  /** Whether the new Aino root already exists (files are not enough). */
  primaryExists: boolean
  /** Whether the legacy root contains a usable `hermes-agent` runtime. */
  legacyRuntimeExists: boolean
}

/**
 * Resolve the home root using the same narrow migration ladder as the
 * bootstrap installer: Aino always wins once created; an existing legacy
 * runtime is used only when the Aino root is still absent.
 */
export function resolveAgentHomePath({
  platform,
  homeDir,
  localAppData,
  primaryExists,
  legacyRuntimeExists
}: AgentHomeResolutionOptions): string {
  const options = { platform, homeDir, localAppData }
  const primary = defaultAgentHomePath(options)
  const legacy = legacyAgentHomePath(options)

  return !primaryExists && legacyRuntimeExists ? legacy : primary
}

/** Resolve the per-application Electron userData directory in dev and prod. */
export function defaultUserDataPath(appDataPath: string): string {
  return path.join(appDataPath, PRODUCT_NAME)
}
