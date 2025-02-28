import { useAppStore } from '@renderer/store'
import { useRouter } from 'vue-router'

export const registerListeners = (): void => {
  const appStore = useAppStore()
  const router = useRouter()
  window.electron.ipcRenderer.send('initApp')
  appStore.globalLoading = true
  window.electron.ipcRenderer.on('initAppReply', (_event, { status, data }) => {
    if (status) {
      for (const key in data) {
        appStore[key] = data[key]
      }
      appStore.globalLoading = false
    }
  })
  window.electron.ipcRenderer.on('updateConfig', (_event, { key, value }) => {
    appStore[key] = value
  })
  window.electron.ipcRenderer.on('message', (_event, { text, type }) => {
    window.$message[type](text)
  })
  window.electron.ipcRenderer.on('redirect', (_event, url) => {
    router.push(url)
  })
}

export const selectFileOrDirectory = (key: string, type: 'File' | 'Directory'): Promise<string> =>
  new Promise((resolve) => {
    {
      window.electron.ipcRenderer.send('select', { type, key })
      window.electron.ipcRenderer.on(`select-${key}`, (_event, value) => {
        resolve(value)
      })
    }
  })
export const checkConfigStatus = (keys: string[]): Promise<boolean> =>
  new Promise((resolve, reject) => {
    {
      window.electron.ipcRenderer.send('checkConfig', keys)
      window.electron.ipcRenderer.on(
        `checkConfig-${keys.join('-')}`,
        (_event, { status, message }) => {
          if (!status) {
            window.$message.error(message)
            reject(false)
          }
          resolve(true)
        }
      )
    }
  })

export const pingHost = (host: string): Promise<boolean> =>
  new Promise((resolve) => {
    window.electron.ipcRenderer.send('ping', host)
    window.electron.ipcRenderer.on('pingReply', (_event, status) => {
      resolve(status)
    })
  })
