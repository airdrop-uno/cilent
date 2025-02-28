<template>
  <n-spin :show="spinning" description="正在领取测试代币">
    <div style="display: flex; justify-content: center">
      <div
        style="
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          width: 50%;
          margin-top: 200px;
        "
      >
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px">
          <n-tag :type="networkStatus ? 'success' : 'error'">{{
            networkStatus ? '网络正常' : '网络不通'
          }}</n-tag>
          <n-input disabled value="testnet.monad.xyz" />
          <n-button
            type="primary"
            :loading="loading"
            ghost
            style="width: 140px"
            @click="checkNetworkStatus"
            >检测网络状态</n-button
          >
        </div>
        <div style="display: flex; align-items: center; gap: 8px">
          <n-input-number v-model:value="amount" placeholder="钱包数量" :show-button="false" />
          <n-button type="primary" ghost style="width: 140px" @click="startMint">
            开始领水
          </n-button>
        </div>
        <div style="margin-top: 16px; max-height: 300px; overflow-y: auto">
          <div v-for="log in mintLogs" :key="log.wallet">
            {{ log.message }}
          </div>
        </div>
      </div>
    </div>
  </n-spin>
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useNotification, NButton } from 'naive-ui'
import { checkConfigStatus, pingHost } from '../utils'
const amount = ref(5)
const message = useMessage()
const router = useRouter()
const notification = useNotification()
const spinning = ref(false)
const networkStatus = ref(false)
const loading = ref(false)
const checkNetworkStatus = async (): Promise<void> => {
  loading.value = true
  networkStatus.value = await pingHost('testnet.monad.xyz')
  loading.value = false
}

const startMint = async (): Promise<void> => {
  if (!amount.value) {
    message.error('请输入钱包数量')
    return
  }
  try {
    await checkConfigStatus(['userDirectory', 'chromeExecutablePath', 'recaptchaToken'])
    spinning.value = true
    window.electron.ipcRenderer.send('mint-monad-faucet', {
      amount: amount.value
    })
  } catch (error) {
    message.error('配置错误', error)
    router.push('/profile')
  }
}

window.electron.ipcRenderer.on('mint-monad-faucet-result', (_event, { wallets, folder }) => {
  spinning.value = false
  notification.success({
    title: '领取成功',
    content: `成功领取 ${wallets.length} 个钱包`,
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
})
const mintLogs = ref<{ wallet: string; message: string }[]>([])
window.electron.ipcRenderer.on('mint-monad-faucet-progress', (_event, { wallet, progress }) => {
  if (progress === 0) {
    mintLogs.value.push({
      wallet,
      message: `正在领取 ${wallet.address} 的代币`
    })
  } else if (progress === 100) {
    mintLogs.value.push({
      wallet,
      message: `领取 ${wallet.address} 的代币成功`
    })
  }
})
</script>
