<template>
  <n-card class="h-[100%]">
    <div class="flex flex-col">
      <div class="flex items-center gap-[8px] mb-[16px]">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-input
              class="w-[300px]"
              disabled
              :value="appStore.userDirectory"
              placeholder="用户数据存储路径"
            />
          </template>
          {{ appStore.userDirectory }}
        </n-tooltip>
        <n-button
          type="primary"
          ghost
          class="w-[140px]"
          @click="selectFileOrDirectory('userDirectory', 'Directory')"
          >选择数据存储路径</n-button
        >
      </div>
      <div class="flex items-center gap-[8px] mb-4">
        <n-input
          v-model:value="appStore.recaptchaToken"
          class="w-[300px]"
          placeholder="Recaptcha Token"
          :show-button="false"
          @blur="set('recaptchaToken', appStore.recaptchaToken)"
        />
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button @click="openExternal('https://2captcha.com/zh/enterpage')"
              >Recaptcha Token</n-button
            >
          </template>
          点击前往注册
        </n-tooltip>
      </div>
      <div class="flex items-center gap-[8px]">
        <n-input
          v-model:value="appStore.smsActiveApiKey"
          class="w-[300px]"
          placeholder="SMSActive API Key"
          :show-button="false"
          @blur="set('smsActiveApiKey', appStore.smsActiveApiKey)"
        />
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button @click="openExternal('https://sms-activate.guru/en')"
              >SMS Active</n-button
            >
          </template>
          点击前往注册
        </n-tooltip>
      </div>
      <div class="mt-[20px]">
        <n-tag>IP 管理</n-tag>
      </div>
    </div>
  </n-card>
</template>

<script lang="ts" setup>
import { NInput, NButton } from 'naive-ui'
import { useAppStore } from '../store'
import { selectFileOrDirectory, openExternal } from '../utils'
const appStore = useAppStore()
const set = (key, value: string) => window.api.set(key, value)
</script>
