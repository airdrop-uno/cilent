import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Store } from '../main/store'
import { NestKey, NestValue } from './index.d'
// Custom APIs for renderer
const api = {
  set: <Key extends NestKey<Store>>(key: Key, value: NestValue<Store, Key>) => {
    return ipcRenderer.send('set', key, value)
  },

  get: <Key extends NestKey<Store>>(key: Key): NestValue<Store, Key> => {
    console.log(key)
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
