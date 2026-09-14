import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ainoCaptcha', {
  getChallenge: () => ipcRenderer.invoke('aino:platform-captcha:get'),
  submit: input => ipcRenderer.invoke('aino:platform-captcha:submit', input)
})
