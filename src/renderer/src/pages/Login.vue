<template>
  <div class="flex justify-center items-center h-[100vh]">
    <n-button type="primary" ghost @click="login">登录</n-button>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../store'
const appStore = useAppStore()
const login = (): void => {
  if (!appStore.address) {
    window.electron.ipcRenderer.send('openExternal', {
      url: 'http://localhost:3000?callback=airdrop.uno://openApp'
    })
  }
}
</script>
