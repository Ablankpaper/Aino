import { describe, expect, it } from 'vitest'

import type { ProjectInfo } from '@/hermes'
import { makeSessionInfo } from '@/test/session-info'

import { overlayLivePreviews, type SidebarProjectTree } from './projects/workspace-groups'
import { recentSessionsOutsideProjects } from './recent-sessions'

const project: ProjectInfo = {
  id: 'p_app',
  name: 'App',
  slug: 'app',
  description: null,
  color: null,
  icon: null,
  board_slug: null,
  created_at: 1,
  archived: false,
  primary_path: '/work/app',
  folders: [{ path: '/work/app', label: null, is_primary: true, added_at: 1 }]
}

const node: SidebarProjectTree = {
  id: 'p_app',
  label: 'App',
  path: '/work/app',
  repos: [],
  sessionCount: 10,
  previewSessions: []
}

describe('Recent outside project navigation', () => {
  it('excludes older external worktree rows using compact backend identities, not just previews', () => {
    const tip = makeSessionInfo({ id: 'tip', _lineage_root_id: 'root', cwd: '/external/task', profile: 'work' })
    const twin = makeSessionInfo({ ...tip, profile: 'default' })
    const tree = [{ ...node, sessionIdentities: [{ id: 'root', profile: 'work' }] }]
    expect(recentSessionsOutsideProjects([tip, twin], [], tree)).toEqual([twin])
  })

  it('keeps unclassified and dismissed-project sessions reachable until a visible project claims them', () => {
    const sessions = [
      makeSessionInfo({ id: 'ordinary', cwd: null }),
      makeSessionInfo({ id: 'project', cwd: '/work/app/src' }),
      makeSessionInfo({ id: 'unknown', cwd: '/other' })
    ]

    expect(recentSessionsOutsideProjects(sessions, [project], [])).toEqual(sessions)
    expect(recentSessionsOutsideProjects(sessions, [project], [node]).map(row => row.id)).toEqual([
      'ordinary',
      'unknown'
    ])
  })

  it('matches the live project preview when a Home session moves before the tree refreshes', () => {
    const session = makeSessionInfo({ id: 'home', cwd: '/work/app' })

    const home: SidebarProjectTree = {
      id: '__no_project__',
      label: 'Home',
      path: null,
      isNoProject: true,
      repos: [],
      sessionCount: 1,
      previewSessions: [makeSessionInfo({ ...session, cwd: null })]
    }

    expect(overlayLivePreviews([node], [session], [project], 3).p_app).toEqual([session])
    expect(recentSessionsOutsideProjects([session], [project], [node, home])).toEqual([])
  })

  it('recognizes external worktrees and compression lineages without mixing profile identities', () => {
    const root = makeSessionInfo({ id: 'root', cwd: '/external/task', profile: 'work' })
    const tip = makeSessionInfo({ ...root, id: 'tip', _lineage_root_id: 'root' })
    const twin = makeSessionInfo({ ...tip, profile: 'default' })
    const tree = [{ ...node, previewSessions: [root] }]
    expect(recentSessionsOutsideProjects([tip, twin], [], tree)).toEqual([twin])
    expect(recentSessionsOutsideProjects([root], [], [{ ...node, previewSessions: [tip] }])).toEqual([])
  })

  it('also consumes full backend lanes rather than relying on the overview preview limit', () => {
    const session = makeSessionInfo({ id: 'older-worktree', cwd: '/external/task' })

    const tree = [
      {
        ...node,
        repos: [
          {
            id: 'repo',
            path: '/work/app',
            label: 'App',
            sessionCount: 1,
            groups: [{ id: 'lane', label: 'Task', path: '/external/task', sessions: [session] }]
          }
        ]
      }
    ]

    expect(recentSessionsOutsideProjects([session], [], tree)).toEqual([])
  })
})
