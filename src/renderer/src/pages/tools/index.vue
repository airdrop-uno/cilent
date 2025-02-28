<template>
  <n-card>
    <n-tabs>
      <n-tab-pane name="网络测试" tab="networkTest">
        <n-space>
          <n-input-group>
            <n-input
              v-model:value="testNetwork.host"
              placeholder="网络测试URL"
              class="w-[200px]"
            />
            <n-input
              v-model:value="testNetwork.proxy"
              placeholder="代理(可选) 协议://username:password@ip:port"
              class="w-[350px]"
            />
            <n-button
              type="primary"
              :loading="testLoading"
              @click="startTestNetwork"
              >开始测试</n-button
            >
          </n-input-group>
        </n-space>
      </n-tab-pane>
      <n-tab-pane name="批量注册Gmail" tab="Gmail">
        <div class="flex items-center gap-[8px]">
          <n-input
            v-model:value="gmailCount"
            placeholder="请输入要注册的Gmail数量"
            class="w-[200px]"
          />
          <n-button @click="registerGmail">开始注册</n-button>
        </div>
      </n-tab-pane>
    </n-tabs>
  </n-card>
</template>
<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { reactive, ref, toRaw } from 'vue'
import { checkApiKey } from '../../utils/account'
import { pingHost } from '@renderer/utils'
const message = useMessage()
const gmailCount = ref('')
const loading = ref(false)
const registerGmail = async () => {
  try {
    await checkApiKey('smsActiveApiKey')
    window.electron.ipcRenderer.send('registerGmail', {
      count: Number(gmailCount.value)
    })
  } catch (error) {
    message.error((error as Error).message)
    loading.value = false
  }
}

const testNetwork = reactive<{ host: string; proxy: string }>({
  host: 'https://www.google.com',
  proxy: 'socks5://xmdcjvbm:3gkects6jlxx@45.38.111.36:5951'
})
const testLoading = ref(false)
const startTestNetwork = async () => {
  testLoading.value = true
  const { status, message: msg, time } = await pingHost(toRaw(testNetwork))
  testLoading.value = false
  if (!status) {
    message.error(msg as string)
  } else {
    message.success(`测试成功，延迟${time}ms`)
  }
}
</script>
