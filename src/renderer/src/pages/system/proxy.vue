<template>
  <n-card style="height: 100vh">
    <n-spin :show="loading" :description="loadingText">
      <n-tabs>
        <n-tab-pane name="staticProxy" tab="静态代理">
          <n-space class="mb-2">
            <n-button
              :disabled="checkedRowKeys.length === 0"
              @click="checkProxy"
              >检测代理</n-button
            >
            <n-button
              type="error"
              :disabled="checkedRowKeys.length === 0"
              @click="batchDeleteProxy"
              >批量删除</n-button
            >
            <n-popconfirm
              class="w-[400px]"
              :show-icon="false"
              positive-text="确定"
              :negative-text="null"
              @positive-click="addProxy"
            >
              <template #trigger>
                <n-button type="primary">添加</n-button>
              </template>
              <n-space vertical>
                <span>格式：protocol://username:password@ip:port</span>
                <span>例如：http://root:123456@127.0.0.1:8080</span>
                <n-input
                  v-model:value="inputProxies"
                  type="textarea"
                  placeholder="请输入IP；回车继续添加"
                />
              </n-space>
            </n-popconfirm>
          </n-space>
          <n-data-table
            :columns="columns"
            :data="staticIps"
            :row-key="(row: RowData) => row.url"
            :checked-row-keys="checkedRowKeys"
            @update:checked-row-keys="handleSelect"
          />
        </n-tab-pane>
      </n-tabs>
    </n-spin>
  </n-card>
</template>
<script setup lang="ts">
import { DataTableColumns, DataTableRowKey, useMessage } from 'naive-ui'
import { onMounted, ref, toRaw } from 'vue'

interface RowData {
  url: string
  status: number
  message?: string
  protocol?: string
  username?: string
  password?: string
  host?: string
  port?: string | number
}
const message = useMessage()
const loading = ref(false)
const loadingText = ref('')
const checkedRowKeys = ref<DataTableRowKey[]>([])
const handleSelect = (rowKeys: DataTableRowKey[]) => {
  checkedRowKeys.value = rowKeys
}
const columns: DataTableColumns<RowData> = [
  {
    type: 'selection',
    fixed: 'left'
  },
  {
    title: '#',
    key: 'key',
    fixed: 'left',
    render: (_, index) => {
      return `${index + 1}`
    }
  },
  {
    title: 'URL',
    key: 'url',
    fixed: 'left'
  },
  {
    title: '协议',
    key: 'protocol'
  },
  {
    title: '用户名',
    key: 'username'
  },
  {
    title: '密码',
    key: 'password'
  },
  {
    title: 'host',
    key: 'host'
  },
  {
    title: '端口',
    key: 'port'
  },
  {
    title: '状态',
    key: 'status'
  },
  {
    title: '操作',
    key: 'action'
  }
]
const staticIps = ref<RowData[]>([])
const inputProxies = ref('')
const checkProxy = () => {
  loading.value = true
  loadingText.value = `正在检测代理可用性...${checkedRowKeys.value.length}个`
  window.electron.ipcRenderer.send('checkProxy', toRaw(checkedRowKeys.value))
  window.electron.ipcRenderer.on('checkProxy', (_, { data }) => {
    for (const item of staticIps.value) {
      if (data[item.url]) {
        item.status = data[item.url].status
        item.message = data[item.url].message
      }
    }
    message.success('检测完成')
    loading.value = false
    checkedRowKeys.value = []
    window.api.set('staticProxy', [...staticIps.value])
  })
}
const batchDeleteProxy = () => {
  loading.value = true
  loadingText.value = `删除中...${checkedRowKeys.value.length}个`
  window.api.set(
    'staticProxy',
    staticIps.value.filter((i) => !checkedRowKeys.value.includes(i.url))
  )
  message.success('删除成功')
  checkedRowKeys.value = []
  loading.value = false
}
const addProxy = () => {
  loading.value = true
  loadingText.value = '保存中...'
  const staticProxy = window.api.get('staticProxy')
  for (const line of inputProxies.value.split('\n').filter(Boolean)) {
    const regex = /^(https?|socks[4-5]):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/
    const match = line.match(regex)
    if (!match) {
      message.error(`格式错误: ${line}`)
      continue
    }
    const [, protocol, username, password, host, port] = match
    const url = `${protocol}://${username ? `${username}:${password}@` : ''}${host}:${port}`
    const item = staticProxy.find((i) => i.url === url)
    if (!item) {
      staticProxy.push({
        url,
        status: 0,
        protocol,
        username,
        password,
        host,
        port
      })
    }
  }
  window.api.set('staticProxy', staticProxy)
  loading.value = false
  message.success('保存成功')
  inputProxies.value = ''
}
onMounted(() => {
  staticIps.value = window.api.get('staticProxy')
})
</script>
