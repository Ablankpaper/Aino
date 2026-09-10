import type { ProjectInfo, SessionInfo } from '@/hermes'

import { liveSessionProjectId, type SidebarProjectTree } from './projects/workspace-groups'

/** Keep unclassified rows discoverable until the authoritative tree arrives. */
export function recentSessionsOutsideProjects(
  sessions: SessionInfo[],
  projects: ProjectInfo[],
  tree: SidebarProjectTree[]
): SessionInfo[] {
  const projectIds = new Set(tree.filter(project => !project.isNoProject).map(project => project.id))
  const membership = new Map<string, boolean>()

  const key = (session: Pick<SessionInfo, 'id' | '_lineage_root_id' | 'profile'>) =>
    `${session.profile || 'default'}:${session._lineage_root_id ?? session.id}`

  for (const project of tree) {
    const rows = [
      ...(project.sessionIdentities ?? []),
      ...(project.previewSessions ?? []),
      ...project.repos.flatMap(repo => repo.groups.flatMap(group => group.sessions))
    ]

    for (const session of rows) {
      membership.set(key(session), !project.isNoProject)
    }
  }

  return sessions.filter(session => {
    const id = liveSessionProjectId(session, projects)

    // Match the live project preview while a cwd move awaits the next snapshot.
    return !((id !== null && projectIds.has(id)) || membership.get(key(session)) === true)
  })
}
