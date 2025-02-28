<template>
  <div style="display: flex; justify-content: center">
    <div style="display: flex; flex-direction: column; width: 50%; margin-top: 200px">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px">
        <n-input disabled :value="appStore.userDirectory" placeholder="用户数据存储路径" />
        <n-button
          type="primary"
          ghost
          style="width: 140px"
          @click="selectFileOrDirectory('userDirectory', 'Directory')"
          >选择数据存储路径</n-button
        >
      </div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px">
        <n-input disabled :value="appStore.chromeExecutablePath" placeholder="浏览器路径" />
        <n-button
          type="primary"
          ghost
          style="width: 140px"
          @click="selectFileOrDirectory('chromeExecutablePath', 'File')"
          >选择浏览器路径</n-button
        >
      </div>
      <div style="display: flex; align-items: center; gap: 8px">
        <n-input
          v-model:value="appStore.recaptchaToken"
          placeholder="recaptcha token"
          :show-button="false"
          @blur="updateConfig('recaptchaToken', appStore.recaptchaToken)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { NInput, NButton } from 'naive-ui'
import { useAppStore } from '../store'
import { selectFileOrDirectory, updateConfig } from '../utils'
const appStore = useAppStore()
</script>
