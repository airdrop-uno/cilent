<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <loading-provider>
            <router-view />
          </loading-provider>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>
<script setup lang="ts">
import { NMessageProvider, NNotificationProvider, darkTheme, NConfigProvider } from 'naive-ui'
import { useAppStore } from './store'
const appStore = useAppStore()

window.electron.ipcRenderer.send('loadData')
window.electron.ipcRenderer.on('loadDataReply', (_event, { data, status }) => {
  if (status) {
    appStore.address = data.address
    appStore.wallets = data.wallets
  }
})
window.electron.ipcRenderer.on('browser-return', (_event, url: string): void => {
  try {
    const urlObj = new URL(url)
    const params = new URLSearchParams(urlObj.search)
    const status = params.get('status')
    const address = params.get('address')
    if (status === 'success' && address) {
      appStore.address = address
      window.electron.ipcRenderer.send('saveAddress', address)
    }
  } catch (error) {
    console.error('URL 解析错误:', error)
  }
})
window.electron.ipcRenderer.on('saveAddressReply', (_event, { address }): void => {
  if (address) {
    appStore.address = address
  }
})
</script>
