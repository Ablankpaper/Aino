import type { BrowserWindow, Rectangle } from 'electron'

interface WorkspaceWindowState {
  bounds: Rectangle
  minimum: number[]
  resizable: boolean
  maximizable: boolean
  fullScreenable: boolean
  maximized: boolean
  fullScreen: boolean
  height: number
  waitingForFullScreenExit: boolean
}

// Login is a native compact window mode, not a card inside workspace-sized
// chrome. Keep workspace geometry separate so login never overwrites it.
export function createAccountWindowController() {
  const states = new WeakMap<BrowserWindow, WorkspaceWindowState>()

  function resizeLogin(win: BrowserWindow, state: WorkspaceWindowState, center: boolean) {
    if (win.isDestroyed() || states.get(win) !== state) {
      return
    }

    const zoom = win.webContents.getZoomFactor()
    win.setMinimumSize(0, 0)
    win.setResizable(true)
    win.setContentSize(Math.round(340 * zoom), Math.round(state.height * zoom))
    win.setResizable(false)
    win.setMaximizable(false)
    win.setFullScreenable(false)

    if (center) {
      win.center()
    }
  }

  return {
    isLogin: (win: BrowserWindow) => states.has(win),
    showLogin(win: BrowserWindow, requestedHeight = 510) {
      let state = states.get(win)
      const first = !state

      if (!state) {
        state = {
          bounds: win.getNormalBounds(),
          minimum: win.getMinimumSize(),
          resizable: win.isResizable(),
          maximizable: win.isMaximizable(),
          fullScreenable: win.isFullScreenable(),
          maximized: win.isMaximized(),
          fullScreen: win.isFullScreen(),
          height: requestedHeight,
          waitingForFullScreenExit: false
        }
        states.set(win, state)
      }

      state.height = Math.min(820, Math.max(453, Math.ceil(requestedHeight)))

      if (win.isFullScreen()) {
        if (!state.waitingForFullScreenExit) {
          state.waitingForFullScreenExit = true
          const saved = state
          win.once('leave-full-screen', () => resizeLogin(win, saved, true))
          win.setFullScreen(false)
        }

        return
      }

      if (win.isMaximized()) {
        win.unmaximize()
      }

      resizeLogin(win, state, first)
    },
    showWorkspace(win: BrowserWindow) {
      const state = states.get(win)

      if (!state || win.isDestroyed()) {
        return
      }

      win.setResizable(true)
      win.setMinimumSize(state.minimum[0], state.minimum[1])
      win.setMaximizable(state.maximizable)
      win.setFullScreenable(state.fullScreenable)
      win.setBounds(state.bounds)
      win.setResizable(state.resizable)
      states.delete(win)

      if (state.maximized) {
        win.maximize()
      }

      if (state.fullScreen) {
        win.setFullScreen(true)
      }
    }
  }
}
