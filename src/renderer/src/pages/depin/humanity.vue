<template>
  <n-tabs>
    <n-tab-pane name="claim" title="claim（仅支持钱包，不支持邮箱）">
      <n-alert title="提示" type="warning" closable>
        仅支持钱包，不支持邮箱
      </n-alert>
      <n-space>
        <n-button @click="handleStart">开始执行</n-button>
        <n-button @click="handleStop">停止</n-button>
        <n-button @click="handleAdd">添加钱包</n-button>
      </n-space>
      <n-data-table
        :columns="columns"
        :data="humanityAccounts"
        striped
        bordered
      />
    </n-tab-pane>
    <n-tab-pane name="logs" title="日志">
      <n-log
        :rows="30"
        :log="logs.join('\n')"
        :font-size="14"
        trim
        language="text"
      />
    </n-tab-pane>
    <n-tab-pane name="query" title="积分查询">
      <n-spin :show="queryLoading" description="查询中...">
        <n-button @click="handleQuery">查询</n-button>
        <n-button @click="inputAddress = ''">清空结果</n-button>
        <n-input
          v-model:value="inputAddress"
          type="textarea"
          placeholder="输入钱包地址（空格、逗号、回车）分开"
        />
      </n-spin>
    </n-tab-pane>
  </n-tabs>
</template>

<script setup lang="ts">
import {
  DataTableColumns,
  NButton,
  useMessage,
  useDialog,
  NInput
} from 'naive-ui'
import { h, onMounted, ref, toRaw } from 'vue'
const dialog = useDialog()
const message = useMessage()
const inputAddress = ref('')
const queryLoading = ref(false)
const logs = ref<string[]>([])
const handleQuery = () => {
  const list: string[] = inputAddress.value
    .replace(/[\s|\n|\r|,]/g, ',')
    .split(',')
    .filter((item) => item)
  queryLoading.value = true
  window.electron.ipcRenderer.send('queryHumanity', list)
  window.electron.ipcRenderer.on(
    'queryHumanity',
    (_event, data: { address: string; integral: number }[]) => {
      message.success('查询成功')
      inputAddress.value =
        '积分详情\n' + data.map((i) => `${i.address}: ${i.integral}`).join('\n')
      queryLoading.value = false
    }
  )
}

interface RowData {
  key: number
  address: string
  privateKey: string
  integral: number
}
const humanityAccounts = ref<Omit<RowData, 'key' | 'action'>[]>([])
const handleStart = () => {
  window.electron.ipcRenderer.send('startHumanity')
}
const handleStop = () => {
  window.electron.ipcRenderer.send('stopHumanity')
}
const addPrivateKey = ref('')
const handleAdd = () => {
  dialog.create({
    title: '添加钱包',
    content: () =>
      h('div', {}, [
        h(NInput, {
          placeholder: '输入钱包私钥，回车隔开',
          value: addPrivateKey.value,
          onUpdateValue: (value) => (addPrivateKey.value = value)
        })
      ]),
    positiveText: '添加',
    negativeText: '取消',
    onPositiveClick: () => {
      const list = addPrivateKey.value
        .trim()
        .split('\n')
        .filter((item) => item)
      const oldList = window.api.get('humanityAccounts')
      window.electron.ipcRenderer.send('addHumanityAccount', [
        ...oldList,
        ...list.map((privateKey) => ({
          privateKey
        }))
      ])
    }
  })
}
const columns: DataTableColumns<RowData> = [
  {
    title: '钱包地址',
    key: 'address'
  },
  {
    title: '私钥',
    key: 'privateKey'
  },
  {
    title: '积分',
    key: 'integral'
  },
  {
    title: '操作',
    key: 'action',
    render(row) {
      return h('div', {}, [
        h(
          NButton,
          {
            type: 'error',
            onClick: () => {
              humanityAccounts.value = humanityAccounts.value.filter(
                (item) => item.address !== row.address
              )
              window.api.set('humanityAccounts', toRaw(humanityAccounts.value))
              message.success('账号已删除')
            }
          },
          '删除'
        )
      ])
    }
  }
]

onMounted(() => {
  window.electron.ipcRenderer.on(
    'storkLog',
    (_event, log: { type: string; message: string }) => {
      logs.value.push(`[${new Date().toLocaleString()}] ${log.message}`)
      if (logs.value.length > 1000) {
        logs.value = logs.value.slice(-1000)
      }
    }
  )
  window.electron.ipcRenderer.on(
    'updateHumanityAccounts',
    (_event, data: RowData[]) => {
      humanityAccounts.value = data
    }
  )
})
</script>
