<template>
  <n-card title="Flow3" style="height: 100vh">
    <n-tabs>
      <n-tab-pane name="dashboard" tab="面板">
        <n-space class="mb-2">
          <n-input v-model:value="runningInfo.referralCode" class="w-[200px]">
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
            class="w-[120px]"
            :options="[
              { label: '不使用代理', value: 'None' },
              { label: '静态代理', value: 'Static' },
              { label: '动态代理', value: 'Dynamic' }
            ]"
          />

          <n-input
            v-if="runningInfo.proxyMode === 'Dynamic'"
            v-model:value="runningInfo.proxyApiUrl"
          >
            <template #prefix>代理API：</template>
          </n-input>
        </n-space>
        <n-space class="mb-2 flex items-center justify-between gap-2">
          <div>
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
          </div>
          <div class="text-sm">
            共{{ data.length }}个，已签到:{{
              data.filter((account) => isSingInToday(account)).length
            }}个，完成任务:{{
              data.filter((account) => account.twitterTaskFinishedCount === 13)
                .length
            }}个
          </div>
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
          :rows="40"
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
import { ref, onMounted, reactive, toRaw } from 'vue'
import { DataTableColumns, useMessage } from 'naive-ui'
import { useAppStore } from '@renderer/store'
import moment from 'moment'
import { useClipboard } from '@vueuse/core'
interface RowData {
  address: string
  privateKey: string
  accessToken: string
  proxy?: string
  todayEarningPoint: number
  totalEarningPoint: number
  referralEarningPoint: number
  twitterTaskFinishedCount: number
  lastRun: Date
  lastDailyTask: Date
  hasDailyTask: boolean
}

const isSingInToday = (row: RowData) => {
  return (
    !row.hasDailyTask ||
    moment(row.lastDailyTask).format('YYYY-MM-DD') ===
      moment.utc().format('YYYY-MM-DD')
  )
}
const { copy } = useClipboard()
const message = useMessage()
const appStore = useAppStore()
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
    title: '钱包地址',
    key: 'address',
    fixed: 'left',
    width: 160,
    render: (row) => {
      return `${row.address.slice(0, 5)}...${row.address.slice(-5)}`
    },
    cellProps(rowData) {
      return {
        onClick: () => {
          copy(rowData.address)
          message.success('地址已复制')
        }
      }
    }
  },
  {
    title: '私钥',
    key: 'privateKey',
    fixed: 'left',
    width: 80,
    render: () => {
      return '***'
    },
    cellProps(row) {
      return {
        onClick: () => {
          copy(row.privateKey)
          message.success('私钥已复制')
        }
      }
    }
  },
  {
    title: '上次心跳时间',
    key: 'lastRun',
    fixed: 'left',
    width: 200,
    render: (row) => {
      return row.lastRun
        ? moment(row.lastRun).format('YYYY-MM-DD HH:mm:ss')
        : '--'
    }
  },
  {
    title: '总积分',
    key: 'totalEarningPoint',
    width: 100,
    render: (row) => {
      return row.totalEarningPoint ? row.totalEarningPoint.toFixed(2) : '--'
    }
  },
  {
    title: '今日积分',
    key: 'todayEarningPoint',
    width: 100,
    render: (row) => {
      return row.todayEarningPoint ? row.todayEarningPoint.toFixed(2) : '--'
    }
  },
  {
    title: '日常签到',
    key: 'dailyTask',
    width: 80,
    render: (row) => {
      if (!row.hasDailyTask && row.lastDailyTask) return '全部签到完成'
      return row.lastDailyTask
        ? moment(row.lastDailyTask).day() === moment().day()
          ? `已签到`
          : `未签到`
        : '未签到'
    }
  },
  {
    title: 'Twitter任务',
    key: 'twitterTaskFinishedCount',
    width: 100,
    render: (row) => {
      return row.twitterTaskFinishedCount === 13
        ? '全部完成'
        : `${row.twitterTaskFinishedCount || 0}/13`
    }
  }
]
const data = ref<RowData[]>([])
const logs = ref<string[]>([])
const batchCreateWalletCount = ref(50)
const runningInfo = reactive({
  referralCode: '',
  concurrency: 10,
  proxyMode: 'None',
  proxyApiUrl: ''
})
const startFlow3 = () => {
  window.electron.ipcRenderer.send('startFlow3', toRaw(runningInfo))
}
const stopFlow3 = () => {
  window.electron.ipcRenderer.send('stopFlow3')
}
const batchCreateWallet = () => {
  if (batchCreateWalletCount.value <= 0) {
    message.error('数量必须大于0')
    return
  }
  appStore.globalLoading = true
  appStore.loadingText = '批量创建钱包中，请稍后...'
  window.electron.ipcRenderer.send(
    'batchCreateFlow3Wallet',
    batchCreateWalletCount.value
  )
}
onMounted(() => {
  const { concurrency, referralCode, wallets, proxyApiUrl, proxyMode } =
    window.api.get('flow3')
  runningInfo.concurrency = concurrency
  runningInfo.referralCode = referralCode
  runningInfo.proxyApiUrl = proxyApiUrl
  runningInfo.proxyMode = proxyMode
  data.value = wallets as any
  window.electron.ipcRenderer.on(
    'flow3Log',
    (_event, log: { type: string; message: string }) => {
      logs.value.push(`[${new Date().toLocaleString()}] ${log.message}`)
      logs.value = logs.value.slice(-40)
    }
  )
  window.electron.ipcRenderer.on('updateFlow3Accounts', (_, accounts) => {
    data.value = accounts
    appStore.globalLoading = false
  })
})
</script>
