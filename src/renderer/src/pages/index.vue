<template>
  <n-space vertical class="overflow-hidden">
    <n-layout has-sider style="background-color: null" class="h-full">
      <n-layout-sider
        v-if="appStore.isActive"
        bordered
        collapse-mode="width"
        :collapsed-width="56"
        :width="200"
        :collapsed="collapsed"
        show-trigger
        class="overflow-hidden"
        style="height: 100vh"
        @collapse="collapsed = true"
        @expand="collapsed = false"
      >
        <n-menu
          v-model:value="appStore.activeKey"
          :collapsed="collapsed"
          :collapsed-width="56"
          :collapsed-icon-size="22"
          :options="menuOptions"
        />
      </n-layout-sider>
      <n-layout class="overflow-y-hidden h-full">
        <router-view />
      </n-layout>
    </n-layout>
  </n-space>
</template>
<script lang="ts">
import { menuOptions } from '@/router/menu'
import { useAppStore } from '@renderer/store'
import { useMessage } from 'naive-ui'
import { defineComponent, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  setup() {
    const appStore = useAppStore()
    const route = useRoute()
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
      appStore.globalLoading = true
      window.electron.ipcRenderer.send('getInitData')
      window.electron.ipcRenderer.on(
        'getInitData',
        (
          _event,
          options: {
            status: boolean
            error: string
            data: { isActive: boolean }
          }
        ) => {
          const {
            error,
            data: { isActive }
          } = options
          appStore.globalLoading = false
          appStore.isActive = isActive
          if (!isActive) {
            message.error('系统未激活，请联系版主')
          }
          if (error) {
            message.error(error)
          }
        }
      )
    })
    watch(
      () => route.fullPath,
      () => {
        appStore.activeKey = route.fullPath
      }
    )
    return {
      appStore,
      collapsed: ref(true),
      menuOptions
    }
  }
})
</script>
