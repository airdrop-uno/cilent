<template>
  <n-space vertical>
    <n-layout has-sider style="background-color: null">
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="56"
        :width="200"
        :collapsed="collapsed"
        show-trigger
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
      <n-layout>
        <router-view />
      </n-layout>
    </n-layout>
  </n-space>
</template>
<script lang="ts">
import { useMessage } from 'naive-ui'
import { defineComponent, h, ref } from 'vue'
import type { MenuOption } from 'naive-ui'
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import { Water, AccessibilitySharp } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions: MenuOption[] = [
  {
    label: '水龙头',
    key: 'Faucet',
    icon: renderIcon(Water),
    children: [
      {
        label: () =>
          h(
            RouterLink,
            {
              to: {
                path: '/'
              }
            },
            { default: () => '领水' }
          ),
        key: 'Monad'
      }
    ]
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            path: '/profile'
          }
        },
        { default: () => 'Monad' }
      ),
    key: 'profile',
    icon: renderIcon(AccessibilitySharp)
  }
]

export default defineComponent({
  setup() {
    window.$message = useMessage()
    return {
      activeKey: ref<string | null>(null),
      collapsed: ref(true),
      menuOptions
    }
  }
})
</script>
