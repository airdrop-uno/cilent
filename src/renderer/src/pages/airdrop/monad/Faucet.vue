<template>
  <n-spin
    :show="spinning"
    description="正在领取测试代币"
    class="overflow-hidden min-h-[500px]"
    style="height: calc(100vh - 90px - 42px)"
  >
    <div class="flex justify-center h-[100%]">
      <div class="flex flex-col items-end mt-[50px] w-1/2">
        <div class="flex items-center gap-[8px] mb-[16px]">
          <n-tooltip trigger="hover">
            <template #trigger>
              <div>无头模式</div>
            </template>
            无头模式不会打开浏览器
          </n-tooltip>
          <n-switch v-model:value="headless" />
        </div>
        <div class="flex items-center gap-[8px] mb-[16px]">
          <n-tag :type="networkStatus ? 'success' : 'error'">{{
            networkStatus ? '网络正常' : '网络不通'
          }}</n-tag>
          <n-input disabled value="testnet.monad.xyz" />
          <n-button
            class="w-[140px]"
            type="primary"
            :loading="loading"
            ghost
            @click="checkNetworkStatus"
            >检测网络状态</n-button
          >
        </div>
        <div class="flex items-center gap-[8px]">
          <n-input-number
            v-model:value="amount"
            placeholder="钱包数量"
            :show-button="false"
          />
          <n-button type="primary" ghost class="w-[140px]" @click="startMint">
            开始领水
          </n-button>
        </div>
      </div>
    </div>
    <div class="mt-[16px] m-h-[300px] overflow-scroll">
      <div v-for="log in mintLogs" :key="log">
        {{ log }}
      </div>
    </div>
  </n-spin>
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { useMessage, useNotification, NButton } from 'naive-ui'
import moment from 'moment'
import { checkConfigStatus, pingHost } from '@renderer/utils'
const amount = ref(5)
const message = useMessage()
const notification = useNotification()
const spinning = ref(false)
const networkStatus = ref(false)
const headless = ref(true)
const loading = ref(false)
const checkNetworkStatus = async (): Promise<void> => {
  loading.value = true
  const { status } = await pingHost({ host: 'testnet.monad.xyz' })
  networkStatus.value = status
  loading.value = false
}

const startMint = async (): Promise<void> => {
  if (!amount.value) {
    message.error('请输入钱包数量')
    return
  }
  try {
    await checkConfigStatus([
      'userDirectory',
      'chromeExecutablePath',
      'recaptchaToken'
    ])
    spinning.value = true
    window.electron.ipcRenderer.send('mintMonadTestToken', {
      amount: amount.value,
      headless: headless.value
    })
  } catch (error) {
    console.error('配置错误', error)
  }
}

window.electron.ipcRenderer.on(
  'batchFaucetMonadFinished',
  (_event, { accounts, folder }) => {
    spinning.value = false
    notification.success({
      title: '领取成功',
      content: `成功领取 ${accounts.length} 个钱包`,
      action: () =>
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            onClick: () => {
              window.electron.ipcRenderer.send('openDirectory', folder)
            }
          },
          { default: () => '打开文件夹' }
        )
    })
  }
)
const mintLogs = ref<string[]>([])
window.electron.ipcRenderer.on(
  'monadFaucetProgress',
  (_event, { status, address, message }) => {
    mintLogs.value.push(
      `${moment().format('YYYY-MM-DD HH:mm:ss')}【${status}】: ${address} ${message}`
    )
    if (status === 'error') {
      spinning.value = false
    }
  }
)
</script>
