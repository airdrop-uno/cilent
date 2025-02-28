<template>
  <n-card>
    <n-tabs type="line" animated>
      <n-tab-pane name="dashboard" tab="面板">
        <n-space class="mb-[16px] flex items-center gap-2">
          <n-button type="primary" @click="start">启动</n-button>
          <n-button type="primary" @click="addAccount">添加账号</n-button>
        </n-space>
        <n-data-table
          :columns="columns"
          :data="data"
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
  </n-card>
</template>

<script setup lang="ts">
import { ref, onMounted, h, toRaw } from 'vue'
import { DataTableColumns, NButton } from 'naive-ui'

const props = defineProps<{
  name: string
  columns: DataTableColumns
  data: any[]
  logs: string[]
  start: () => void
  defaultAccount: () => any
  saveAccounts: () => void
}>()
const addDrawerVisible = ref(false)
const addAccounts = ref<any[]>([])
const addAccount = () => {
  addAccounts.value = [props.defaultAccount()]
  addDrawerVisible.value = true
}
</script>
