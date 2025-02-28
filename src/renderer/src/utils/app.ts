import { useAppStore } from '@/store'
import { getActivePinia } from 'pinia'
import { useRouter } from 'vue-router'

export const registerListeners = (): void => {
  const router = useRouter()
  const pinia = getActivePinia()
  const appStore = useAppStore(pinia)
  window.electron.ipcRenderer.send('init')
  appStore.globalLoading = true
  window.electron.ipcRenderer.on('init', (_event, { status, data }) => {
    if (status) {
      for (const key in data) {
        appStore[key] = data[key]
      }
      appStore.globalLoading = false
    }
  })
  window.electron.ipcRenderer.on('message', (_event, { text, type }) => {
    window.$message[type](text)
  })
  window.electron.ipcRenderer.on('redirect', (_event, url) => {
    router.push(url)
  })
}

export const selectFileOrDirectory = (
  key: string,
  type: 'File' | 'Directory'
): Promise<string> =>
  new Promise((resolve) => {
    {
      const pinia = getActivePinia()
      const appStore = useAppStore(pinia)
      window.electron.ipcRenderer.send('select', { type, key })
      window.electron.ipcRenderer.on(`select-${key}`, (_event, value) => {
        appStore[key] = value
        resolve(value)
      })
    }
  })
export const checkConfigStatus = (keys: string[]): Promise<boolean> =>
  new Promise((resolve, reject) => {
    {
      window.electron.ipcRenderer.send('check', keys)
      window.electron.ipcRenderer.on(
        `check-${keys.join('-')}`,
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

export const pingHost = (options: {
  host: string
  proxy?: string
}): Promise<{ status: boolean; time: number; message?: string }> =>
  new Promise((resolve) => {
    window.electron.ipcRenderer.send('ping', options)
    window.electron.ipcRenderer.on(
      'ping',
      (_event, result: { status: boolean; time: number; message?: string }) => {
        resolve(result)
      }
    )
  })

export const openExternal = (url: string): void => {
  window.electron.ipcRenderer.send('openExternal', url)
}

export const getChainBalance = (
  provider: string,
  address: string
): Promise<number> =>
  new Promise((resolve) => {
    window.electron.ipcRenderer.send('getChainBalance', { provider, address })
    window.electron.ipcRenderer.on(
      'getChainBalance',
      (_event, { balance, status, message }) => {
        if (status) {
          resolve(balance)
        } else {
          window.$message.error(message)
        }
      }
    )
  })
