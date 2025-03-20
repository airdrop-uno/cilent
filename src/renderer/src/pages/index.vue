<template>
  <n-space vertical class="overflow-hidden">
    <n-layout has-sider style="background-color: null">
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="56"
        :width="200"
        :collapsed="collapsed"
        show-trigger
        class="h-[100vh] overflow-y-hidden"
        style="height: 100vh"
        @collapse="collapsed = true"
        @expand="collapsed = false"
      >
        <n-menu
          v-model:value="activeKey"
          :collapsed="collapsed"
          :collapsed-width="56"
          :collapsed-icon-size="22"
          :options="menuOptions"
        />
      </n-layout-sider>
      <n-layout class="overflow-y-hidden">
        <router-view />
      </n-layout>
    </n-layout>
  </n-space>
</template>
<script lang="ts">
import { menuOptions } from '@/router/menu'
import { useMessage } from 'naive-ui'
import { defineComponent, onMounted, ref } from 'vue'

export default defineComponent({
  setup() {
    const message = useMessage()
    window.$message = message
    onMounted(() => {
      window.electron.ipcRenderer.on(
        'toastMessage',
        (
          _event,
          {
            status,
            message: msg
          }: {
            status: 'success' | 'error' | 'info' | 'warning'
            message: string
          }
        ) => {
          message[status](msg)
        }
      )
    })
    return {
      activeKey: ref<string | null>(null),
      collapsed: ref(true),
      menuOptions
    }
  }
})
</script>
