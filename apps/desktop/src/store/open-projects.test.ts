import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { rescopeConnectionScopedStores } from '@/lib/connection-scoped'
import { readJson } from '@/lib/storage'
import { $activeGatewayProfile, $showAllProfiles } from '@/store/profile'

import {
  $openedProjects,
  $openProjectsByProfile,
  forgetOpenProject,
  isOpenedProject,
  rememberOpenProject
} from './open-projects'

const localConnection = { mode: 'local', profile: 'default' } as const
const remoteConnection = { mode: 'remote', baseUrl: 'https://work.example', profile: 'default' } as const

beforeEach(() => {
  window.localStorage.clear()
  rescopeConnectionScopedStores(localConnection)
  $openProjectsByProfile.set({})
  $activeGatewayProfile.set('default')
  $showAllProfiles.set(false)
})

afterEach(() => {
  rescopeConnectionScopedStores(localConnection)
  $openProjectsByProfile.set({})
  $activeGatewayProfile.set('default')
  $showAllProfiles.set(false)
  window.localStorage.clear()
})

describe('explicitly opened projects', () => {
  it('isolates profiles and closes merged project rows by path without closing unrelated projects', () => {
    const project = { id: 'default-project', path: '/work/project' }
    const otherProfileProject = { id: 'coder-project', path: project.path }
    const virtualProject = { id: 'virtual-project', path: null }

    expect($openedProjects.get()).toEqual([])
    expect(isOpenedProject(project)).toBe(false)
    rememberOpenProject(project)
    rememberOpenProject(project)
    expect($openedProjects.get()).toEqual([project])

    $activeGatewayProfile.set('coder')
    expect($openedProjects.get()).toEqual([])
    rememberOpenProject(otherProfileProject)
    rememberOpenProject(virtualProject)
    forgetOpenProject(otherProfileProject)
    expect($openedProjects.get()).toEqual([virtualProject])

    $activeGatewayProfile.set('default')
    expect($openedProjects.get()).toEqual([project])
    $activeGatewayProfile.set('coder')
    rememberOpenProject(otherProfileProject)

    $showAllProfiles.set(true)
    const mergedProject = { id: 'merged-project', path: project.path }
    expect(isOpenedProject(mergedProject)).toBe(true)
    expect(isOpenedProject({ id: virtualProject.id, path: '/new/location' })).toBe(true)
    expect(isOpenedProject({ id: 'unopened-project', path: null })).toBe(false)

    forgetOpenProject(mergedProject)
    expect($openedProjects.get()).toEqual([virtualProject])
    $showAllProfiles.set(false)
    $activeGatewayProfile.set('default')
    expect($openedProjects.get()).toEqual([])
    $activeGatewayProfile.set('coder')
    expect($openedProjects.get()).toEqual([virtualProject])
  })

  it('persists each connection separately and restores its open projects after reconnecting', () => {
    const localProject = { id: 'project', path: '/local/project' }
    const remoteProject = { id: 'project', path: '/remote/project' }
    const remoteProfileProject = { id: 'coder-project', path: '/remote/coder' }

    rememberOpenProject(localProject)
    expect(readJson('hermes.desktop.openProjectsByProfile')).toEqual({ default: [localProject] })

    rescopeConnectionScopedStores(remoteConnection)
    expect($openedProjects.get()).toEqual([])
    rememberOpenProject(remoteProject)
    rescopeConnectionScopedStores({ ...remoteConnection, profile: 'coder' })
    $activeGatewayProfile.set('coder')
    expect($openedProjects.get()).toEqual([])
    rememberOpenProject(remoteProfileProject)

    expect(readJson('hermes.desktop.openProjectsByProfile')).toEqual({ default: [localProject] })
    expect(
      readJson(`hermes.desktop.openProjectsByProfile.remote.${encodeURIComponent(remoteConnection.baseUrl)}`)
    ).toEqual({ default: [remoteProject], coder: [remoteProfileProject] })

    rescopeConnectionScopedStores({ ...remoteConnection, baseUrl: 'https://other.example' })
    expect($openedProjects.get()).toEqual([])
    rescopeConnectionScopedStores(localConnection)
    $activeGatewayProfile.set('default')
    expect($openedProjects.get()).toEqual([localProject])

    rescopeConnectionScopedStores(remoteConnection)
    expect($openedProjects.get()).toEqual([remoteProject])
    rescopeConnectionScopedStores(null)
    expect($openedProjects.get()).toEqual([remoteProject])
    $activeGatewayProfile.set('coder')
    expect($openedProjects.get()).toEqual([remoteProfileProject])
  })
})
