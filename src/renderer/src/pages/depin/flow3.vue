<template>
  <n-card class="h-full" title="Flow3">
    <n-tabs>
      <n-tab-pane name="dashboard" tab="面板">
        <n-space>
          <n-input-number v-model:value="runningInfo.interval">
            <template #prefix>轮询间隔：</template>
            <template #suffix>秒</template>
          </n-input-number>
          <n-input-number v-model:value="runningInfo.concurrency">
            <template #prefix>并发数：</template>
          </n-input-number>
          <n-select
            v-model:value="runningInfo.proxyMode"
            :options="[
              { label: '不使用代理', value: 'None' },
              { label: '静态代理', value: 'Static' },
              { label: '动态代理', value: 'Dynamic' }
            ]"
          >
            <template #header>代理模式</template>
          </n-select>

          <n-input
            v-if="runningInfo.proxyMode === 'Dynamic'"
            v-model:value="runningInfo.proxyApiUrl"
          >
            <template #prefix>代理API：</template>
          </n-input>
        </n-space>
        <n-space class="mb-[16px] flex items-center gap-2">
          <n-button type="primary" @click="startFlow3">启动</n-button>
          <n-button type="primary" @click="stopFlow3">停止</n-button>
          <n-popconfirm
            :show-icon="false"
            positive-text="确定"
            :negative-text="null"
            @positive-click="batchCreateWallet"
          >
            <template #trigger>
              <n-button>批量创建钱包</n-button>
            </template>
            <n-input-number
              v-model:value="batchCreateWalletCount"
              placeholder="输入创建钱包数量"
            />
          </n-popconfirm>
        </n-space>
        <n-data-table
          :columns="columns"
          :data="data"
          striped
          bordered
          :max-height="600"
          :pagination="{
            pageSize: 20,
            showQuickJumper: true
          }"
        />
      </n-tab-pane>
      <n-tab-pane name="logs" tab="日志">
        <n-log
          :rows="48"
          :log="logs.join('\n')"
          :font-size="14"
          trim
          language="text"
        />
      </n-tab-pane>
    </n-tabs>
  </n-card>
</template>
<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { DataTableColumns } from 'naive-ui'
interface RowData {
  address: string
  accessToken: string
  proxy?: string
}
const columns: DataTableColumns<RowData> = [
  {
    title: '#',
    key: 'key',
    fixed: 'left',
    render: (_, index) => {
      return `${index + 1}`
    }
  },
  {
    title: '地址',
    key: 'address',
    fixed: 'left',
    width: 250
  },
  {
    title: '状态',
    key: 'status',
    width: 250
  },
  {
    title: '执行时间',
    key: 'running',
    width: 250
  },
  {
    title: '总积分',
    key: 'totalEarningPoint',
    width: 100
  },
  {
    title: '今日积分',
    key: 'todayEarningPoint',
    width: 100
  }
]
const data = ref<RowData[]>([])
const logs = ref<string[]>([])
const batchCreateWalletCount = ref(50)
const runningInfo = reactive({
  interval: 10,
  concurrency: 10,
  proxyMode: 'None',
  proxyApiUrl: ''
})
const startFlow3 = () => {
  window.electron.ipcRenderer.send('startFlow3', runningInfo)
}
const stopFlow3 = () => {
  window.electron.ipcRenderer.send('stopFlow3')
  window.api.set('monadScore.concurrency', runningInfo.concurrency)
}
const batchCreateWallet = () => {
  window.electron.ipcRenderer.send(
    'batchCreateWallet',
    batchCreateWalletCount.value
  )
}
onMounted(() => {
  window.electron.ipcRenderer.on(
    'flow3Log',
    (_event, log: { type: string; message: string }) => {
      logs.value.push(`[${new Date().toLocaleString()}] ${log.message}`)
      if (logs.value.length > 1000) {
        logs.value = logs.value.slice(-1000)
      }
    }
  )
})
</script>
