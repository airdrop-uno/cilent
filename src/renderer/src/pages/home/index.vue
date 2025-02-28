<template>
  <n-card title="" style="height: 100vh">
    <div class="h-full flex flex-col items-center justify-center gap-4">
      <n-input-group v-if="!appStore.isActive" class="w-[300px]">
        <n-input
          v-model:value="activationCode"
          placeholder="输入激活码"
          class="w-[160px]"
        />
        <n-button
          type="primary"
          :disabled="!activationCode"
          @click="activeClient"
        >
          激活
        </n-button>
      </n-input-group>

      <ContractMe />
    </div>
  </n-card>
</template>
<script setup lang="ts">
import ContractMe from '@/components/ContractMe.vue'
import { useAppStore } from '@renderer/store'
import { ref } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const activationCode = ref('')
const appStore = useAppStore()
const activeClient = () => {
  appStore.globalLoading = true
  appStore.loadingText = '软件激活中...'
  window.electron.ipcRenderer.send('activeClient', activationCode.value)
  window.electron.ipcRenderer.on(
    'activeClient',
    (
      _,
      options: { error: string; data: { isActive: boolean; message: string } }
    ) => {
      appStore.globalLoading = false
      const {
        error,
        data: { isActive, message: msg }
      } = options
      appStore.isActive = isActive
      if (error) {
        message.error(error)
      }
    }
  )
}
</script>
