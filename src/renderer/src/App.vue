<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <n-spin
            :show="appStore.globalLoading"
            :description="appStore.loadingText"
          >
            <layout />
          </n-spin>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>
<script setup lang="ts">
import {
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
  darkTheme,
  NConfigProvider,
  NSpin
} from 'naive-ui'
import { useAppStore } from './store'
import { registerListeners } from './utils'
import Layout from './pages/index.vue'
const appStore = useAppStore()
registerListeners()

window.electron.ipcRenderer.on(
  'browser-return',
  (_event, url: string): void => {
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
  }
)
</script>
