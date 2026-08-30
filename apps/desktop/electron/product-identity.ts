import path from 'node:path'

import identity from '../brand.json'

export const PRODUCT_NAME = identity.productName
export const AGENT_NAME = identity.agentName
export const APP_ID = identity.appId
export const HOME_DIR_NAME = identity.homeDirName
export const PRIMARY_PROTOCOL = identity.primaryProtocol
export const LEGACY_PROTOCOL = identity.legacyProtocol
export const REPOSITORY_URL = identity.repositoryUrl
export const UPSTREAM_REPOSITORY_URL = identity.upstreamRepositoryUrl
export const REPOSITORY_PATH = REPOSITORY_URL.replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '')

/** Resolve the default Aino agent data root for a host platform. */
export function defaultAgentHomePath({
  platform,
  homeDir,
  localAppData
}: {
  platform: string
  homeDir: string
  localAppData?: string
}): string {
  const pathModule = platform === 'win32' ? path.win32 : path.posix

  if (platform === 'win32' && localAppData) {
    return pathModule.join(localAppData, HOME_DIR_NAME)
  }

  return pathModule.join(homeDir, `.${HOME_DIR_NAME}`)
}

/** Resolve the per-application Electron userData directory in dev and prod. */
export function defaultUserDataPath(appDataPath: string): string {
  return path.join(appDataPath, PRODUCT_NAME)
}
