import { EventEmitter } from 'node:events'

import type { BrowserWindow } from 'electron'
import { describe, expect, it } from 'vitest'

import { createAccountWindowController } from './account-window'

class WindowFixture extends EventEmitter {
  bounds = { x: 50, y: 60, width: 1280, height: 900 }
  minimum = [900, 600]
  resizable = true
  maximizable = true
  fullScreenable = true
  maximized = false
  fullScreen = false
  webContents = { getZoomFactor: () => 1.5 }
  getNormalBounds() {
    return { ...this.bounds }
  }
  getMinimumSize() {
    return [...this.minimum]
  }
  isResizable() {
    return this.resizable
  }
  isMaximizable() {
    return this.maximizable
  }
  isFullScreenable() {
    return this.fullScreenable
  }
  isMaximized() {
    return this.maximized
  }
  isFullScreen() {
    return this.fullScreen
  }
  isDestroyed() {
    return false
  }
  setMinimumSize(width: number, height: number) {
    this.minimum = [width, height]
  }
  setContentSize(width: number, height: number) {
    this.bounds = { ...this.bounds, width, height }
  }
  setResizable(value: boolean) {
    this.resizable = value
  }
  setMaximizable(value: boolean) {
    this.maximizable = value
  }
  setFullScreenable(value: boolean) {
    this.fullScreenable = value
  }
  setFullScreen(value: boolean) {
    this.fullScreen = value
  }
  setBounds(value: typeof this.bounds) {
    this.bounds = value
  }
  center() {
    this.bounds = { ...this.bounds, x: 200, y: 150 }
  }
  maximize() {
    this.maximized = true
  }
  unmaximize() {
    this.maximized = false
  }
}

describe('account window mode', () => {
  it('resizes the native window for login steps and restores workspace geometry on sign-in', () => {
    const fixture = new WindowFixture()
    const win = fixture as unknown as BrowserWindow
    const controller = createAccountWindowController()
    const original = { ...fixture.bounds }
    controller.showLogin(win, 540)
    expect(fixture.bounds.width).toBe(510)
    expect(fixture.bounds.height).toBe(810)
    expect(fixture.resizable).toBe(false)
    expect(controller.isLogin(win)).toBe(true)
    controller.showLogin(win, 600)
    controller.showWorkspace(win)
    expect(fixture.bounds).toEqual(original)
    expect(fixture.minimum).toEqual([900, 600])
    expect(fixture.resizable).toBe(true)
    expect(controller.isLogin(win)).toBe(false)
  })

  it('ignores a late fullscreen exit after the user has already signed in', () => {
    const fixture = new WindowFixture()
    fixture.fullScreen = true
    const win = fixture as unknown as BrowserWindow
    const controller = createAccountWindowController()
    const original = { ...fixture.bounds }
    controller.showLogin(win)
    controller.showWorkspace(win)
    fixture.emit('leave-full-screen')
    expect(fixture.bounds).toEqual(original)
    expect(fixture.fullScreen).toBe(true)
  })
})
