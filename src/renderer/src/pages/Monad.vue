<template>
  <n-spin :show="spinning" description="正在领取测试代币">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px">
      <n-tag v-if="networkStatus" type="success">网络畅通</n-tag>
      <n-tag v-else type="error">网络不通</n-tag>
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
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px">
      <n-input disabled :value="selectFolder" placeholder="数据存储路径" />
      <n-button type="primary" ghost style="width: 140px" @click="selectPath"
        >选择数据存储路径</n-button
      >
    </div>
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px">
      <n-input disabled :value="executablePath" placeholder="浏览器路径" />
      <n-button type="primary" ghost style="width: 140px" @click="selectPath"
        >选择浏览器路径</n-button
      >
    </div>
    <div style="display: flex; align-items: center; gap: 8px">
      <n-input-number v-model:value="amount" placeholder="钱包数量" :show-button="false" />
      <n-input v-model:value="recaptchaToken" placeholder="recaptcha token" :show-button="false">
        <template #suffix> </template>
      </n-input>
      <n-button type="primary" ghost style="width: 140px" @click="startMint"> 开始领水 </n-button>
    </div>
    <div v-for="log in mintLogs" :key="log.wallet">
      {{ log.message }}
    </div>
  </n-spin>
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { NInputNumber, NInput, NButton, useMessage, useNotification, NTag, NSpin } from 'naive-ui'
// '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
const amount = ref()
const recaptchaToken = ref('e4359912f575054d499739864178a8cb')
const selectFolder = ref()
const executablePath = ref('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const message = useMessage()
const notification = useNotification()
const spinning = ref(false)
const networkStatus = ref(false)
const loading = ref(false)
const checkNetworkStatus = (): void => {
  loading.value = true
  window.electron.ipcRenderer.send('ping', 'testnet.monad.xyz')
}
window.electron.ipcRenderer.on('ping-result', (_event, result) => {
  networkStatus.value = result
  loading.value = false
})

const startMint = (): void => {
  if (!amount.value) {
    message.error('请输入钱包数量')
    return
  }
  if (!recaptchaToken.value) {
    message.error('请输入recaptcha token')
    return
  }
  if (!selectFolder.value) {
    message.error('请选择数据存储路径')
    return
  }
  if (!executablePath.value) {
    message.error('请选择浏览器路径')
    return
  }
  spinning.value = true
  window.electron.ipcRenderer.send('mint-monad-faucet', {
    amount: amount.value,
    recaptchaToken: recaptchaToken.value,
    selectFolder: selectFolder.value,
    executablePath: executablePath.value
  })
}

const selectPath = (): void => {
  window.electron.ipcRenderer.send('select-path')
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
            window.electron.ipcRenderer.send('open-folder', folder)
          }
        },
        { default: () => '打开文件夹' }
      )
  })
})

window.electron.ipcRenderer.on('select-path-result', (_event, result) => {
  selectFolder.value = result.filePaths[0]
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
