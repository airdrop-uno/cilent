<template>
  <n-card style="height: 100vh" title="MonadScore" class="overflow-hidden">
    <n-spin :show="loading" description="更新钱包中，请稍后...">
      <n-tabs type="line" animated>
        <n-tab-pane name="dashboard" tab="面板">
          <n-space class="mb-2">
            <n-input
              v-model:value="runningInfo.referralCode"
              placeholder=""
              class="w-[180px]"
            >
              <template #prefix>邀请码：</template>
            </n-input>
            <n-input-number
              v-model:value="runningInfo.concurrency"
              class="w-[160px]"
            >
              <template #prefix>并发数：</template>
            </n-input-number>
            <n-select
              v-model:value="runningInfo.proxyMode"
              placeholder=""
              class="w-[140px]"
              :options="[
                { label: '不使用代理', value: 'None' },
                { label: '静态代理', value: 'Static' },
                { label: '动态代理', value: 'Dynamic' }
              ]"
            >
            </n-select>

            <n-input
              v-if="runningInfo.proxyMode === 'Dynamic'"
              v-model:value="runningInfo.proxyApiUrl"
              placeholder=""
            >
              <template #prefix>代理API：</template>
            </n-input>
          </n-space>
          <n-space class="mb-[16px] flex items-center gap-2">
            <n-button type="primary" @click="startMonadScore">启动</n-button>
            <n-button type="primary" @click="stopMonadScore">停止</n-button>
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
            :data="accounts"
            striped
            bordered
            :max-height="600"
            :pagination="{
              pageSize: 20,
              showQuickJumper: true
            }"
          />
          <n-space class="my-2">
            <div class="text-sm">
              共{{ accounts.length }}个，已注册{{
                accounts.filter((account) => account.registered).length
              }}个
            </div>
          </n-space>
        </n-tab-pane>
        <n-tab-pane name="logs" tab="日志">
          <n-log
            :rows="40"
            :log="logs.join('\n')"
            :font-size="14"
            trim
            language="text"
          />
        </n-tab-pane>
      </n-tabs>
    </n-spin>
  </n-card>
</template>
<script setup lang="ts">
import { DataTableColumns } from 'naive-ui'
import { onMounted, reactive, ref, toRaw } from 'vue'
import { useMessage } from 'naive-ui'
import moment from 'moment'
interface RowData {
  address: string
  referralCode: string
  points: number
  proxy: string
  registered: boolean
  message: string
  nodeRunning: Date
  claimedTasks: string[]
  taskCompleted: number
}
const message = useMessage()
const loading = ref(false)
const columns: DataTableColumns<RowData> = [
  {
    title: '#',
    key: 'key',
    fixed: 'left',
    width: 50,
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
    title: '积分',
    key: 'points',
    width: 100
  },
  {
    title: '注册状态',
    key: 'registered',
    width: 100,
    render(row) {
      return row.registered ? '已注册' : '未注册'
    }
  },
  {
    title: '完成任务数量',
    key: 'claimedTasks',
    width: 120,
    render(row) {
      return row.claimedTasks?.length || row.taskCompleted
    }
  },
  {
    title: '运行状态',
    key: 'nodeRunning',
    width: 100,
    render(row) {
      const isRunning =
        row.nodeRunning &&
        moment().format('YYYY-MM-DD') ===
          moment(row.nodeRunning).format('YYYY-MM-DD') &&
        moment(row.nodeRunning).hour() > 8
      return isRunning ? '运行中' : '未运行'
    }
  },
  {
    title: '运行日志',
    key: 'message',
    width: 200
  },
  {
    title: '邀请码',
    key: 'referralCode',
    width: 100
  },
  {
    title: '代理',
    key: 'proxy',
    minWidth: 350
  }
  // {
  //   title: '操作',
  //   key: 'actions',
  //   width: 250,
  //   fixed: 'right'
  // }
]
const logs = ref<string[]>([])
const runningInfo = reactive({
  referralCode: '',
  concurrency: 10,
  proxyMode: 'None',
  proxyApiUrl: ''
})
const accounts = ref<RowData[]>([])
const batchCreateWalletCount = ref(50)

const batchCreateWallet = () => {
  console.log(batchCreateWalletCount.value)
  if (batchCreateWalletCount.value <= 0) {
    message.error('数量必须大于0')
    return
  }
  window.electron.ipcRenderer.send(
    'batchCreateWallet',
    batchCreateWalletCount.value
  )
}
const startMonadScore = () => {
  window.electron.ipcRenderer.send('startMonadScore', toRaw(runningInfo))
}
const stopMonadScore = () => {
  window.electron.ipcRenderer.send('stopMonadScore')
}

onMounted(() => {
  const { referralCode, concurrency, proxyMode, proxyApiUrl, wallets } =
    window.api.get('monadScore')
  console.log(referralCode, concurrency, proxyMode, proxyApiUrl, wallets)
  runningInfo.referralCode = referralCode
  runningInfo.concurrency = concurrency
  runningInfo.proxyMode = proxyMode
  runningInfo.proxyApiUrl = proxyApiUrl
  accounts.value = [...wallets] as any

  window.electron.ipcRenderer.on(
    'updateMonadScoreAccounts',
    (_event, _accounts) => {
      accounts.value = [..._accounts] as any
    }
  )

  window.electron.ipcRenderer.on(
    'monadScoreLog',
    (_event, log: { type: string; message: string }) => {
      logs.value.push(`[${new Date().toLocaleString()}] ${log.message}`)
      if (logs.value.length > 1000) {
        logs.value = logs.value.slice(-1000)
      }
    }
  )
})
</script>
