import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Store } from '../main/store'

// Custom APIs for renderer
const api = {
  set: <Key extends keyof Store>(key: Key, value: Store[Key]) => {
    ipcRenderer.send('set', key, value)
  },

  get: <Key extends keyof Store>(key: Key): Store[Key] => {
    return ipcRenderer.sendSync('get', key)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
