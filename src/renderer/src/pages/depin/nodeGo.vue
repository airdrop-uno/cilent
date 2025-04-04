<template>
  <n-card>
    <n-tabs type="line" animated>
      <n-tab-pane name="dashboard" tab="面板">
        <n-space class="mb-[16px] flex items-center gap-2">
          <n-button type="primary" @click="startNodeGo">启动</n-button>
          <n-button type="primary" @click="addAccount">添加账号</n-button>
        </n-space>
        <n-data-table
          :columns="columns"
          :data="accounts"
          striped
          bordered
          :max-height="450"
        />
      </n-tab-pane>
      <n-tab-pane name="logs" tab="日志">
        <n-log
          :rows="30"
          :log="logs.join('\n')"
          :font-size="14"
          trim
          language="text"
        />
      </n-tab-pane>
    </n-tabs>
    <n-drawer v-model:show="addDrawerVisible" :width="650">
      <n-drawer-content title="添加账号">
        <n-button @click="addAccounts.push(defaultAccount())"
          >继续添加</n-button
        >
        <div class="flex flex-col gap-2 mt-2">
          <n-input-group v-for="(account, index) in addAccounts" :key="index">
            <n-auto-complete
              v-model:value="account.email"
              placeholder="邮箱"
              clearable
              :options="
                ['@gmail.com', '@163.com', '@qq.com'].map((suffix) => {
                  const prefix = account.email.split('@')[0]
                  return {
                    label: prefix + suffix,
                    value: prefix + suffix
                  }
                })
              "
            />
            <n-input v-model:value="account.token" placeholder="Token" />
            <n-input v-model:value="account.proxy" placeholder="代理" />
          </n-input-group>
        </div>
        <template #footer>
          <n-button type="error" class="mr-4" @click="addDrawerVisible = false"
            >取消</n-button
          >
          <n-button type="primary" @click="saveAccounts">保存</n-button>
        </template>
      </n-drawer-content>
    </n-drawer>
  </n-card>
</template>
<script setup lang="ts">
import {
  DataTableColumns,
  NButton,
  NInput,
  useDialog,
  useMessage
} from 'naive-ui'
import { h, onMounted, ref, toRaw } from 'vue'
interface RowData {
  key: number
  email: string
  token: string
  proxy: string
  ua: string
  point: number
}
type NodeGoAccount = Omit<RowData, 'key'>
const message = useMessage()
const dialog = useDialog()
const logs = ref<string[]>([])
const accounts = ref<NodeGoAccount[]>([])

const defaultAccount: () => NodeGoAccount = () => ({
  email: '',
  proxy: '',
  point: 0,
  token: '',
  ua: ''
})
const addAccounts = ref<NodeGoAccount[]>([])
const addDrawerVisible = ref(false)
const columns: DataTableColumns<RowData> = [
  {
    title: '邮箱',
    key: 'email',
    fixed: 'left',
    width: 250
  },
  {
    title: 'Token',
    key: 'token',
    width: 100,
    ellipsis: true
  },
  {
    title: '代理',
    key: 'proxy',
    ellipsis: true
  },
  {
    title: '积分',
    key: 'point',
    width: 100
  },

  {
    key: 'action',
    title: '操作',
    fixed: 'right',
    width: 150,
    render(row) {
      return h(
        'div',
        {
          class: 'flex items-center gap-2'
        },
        [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => {
                dialog.create({
                  title: '编辑账号',
                  content: () =>
                    h(
                      'div',
                      {
                        class: 'flex flex-col gap-2'
                      },
                      [
                        h(NInput, {
                          placeholder: '邮箱',
                          value: row.email,
                          onUpdateValue: (value) => {
                            row.email = value
                          }
                        }),
                        h(NInput, {
                          placeholder: 'Token',
                          value: row.token,
                          onUpdateValue: (value) => {
                            row.token = value
                          }
                        }),
                        h(NInput, {
                          placeholder: '代理',
                          value: row.proxy,
                          onUpdateValue: (value) => {
                            row.proxy = value
                          }
                        })
                      ]
                    ),
                  positiveText: '确定',
                  negativeText: '取消',
                  onPositiveClick: () => {
                    window.api.set('nodeGoAccounts', toRaw(accounts.value))
                    message.success('账号已更新')
                  }
                })
              }
            },
            '编辑'
          ),
          h(
            NButton,
            {
              type: 'error',
              size: 'small',
              onClick: () => {
                accounts.value = accounts.value.filter(
                  (account) => account.email !== row.email
                )
                window.api.set('nodeGoAccounts', toRaw(accounts.value))
                message.success('账号已删除')
              }
            },
            '删除'
          )
        ]
      )
    }
  }
]

const startNodeGo = () => {
  const list = window.api.get('nodeGoAccounts')
  if (!list.length) {
    message.error('先添加账号')
    return
  }
  window.electron.ipcRenderer.send('startNodeGo')
}
const addAccount = () => {
  addAccounts.value = [defaultAccount()]
  addDrawerVisible.value = true
}
const saveAccounts = () => {
  accounts.value = addAccounts.value.concat(accounts.value)
  window.api.set('nodeGoAccounts', JSON.parse(JSON.stringify(accounts.value)))
  message.success('账号已保存')
  addDrawerVisible.value = false
  addAccounts.value = []
}
onMounted(() => {
  accounts.value = window.api.get('nodeGoAccounts') as any
  window.electron.ipcRenderer.on(
    'nodeGoLog',
    (_event, log: { type: string; message: string }) => {
      logs.value.push(`[${new Date().toLocaleString()}] ${log.message}`)
      if (logs.value.length > 1000) {
        logs.value = logs.value.slice(-1000)
      }
    }
  )
  window.electron.ipcRenderer.on(
    'updateNodeGoAccounts',
    (_event, _accounts: NodeGoAccount[]) => {
      accounts.value = _accounts
    }
  )
})
</script>
