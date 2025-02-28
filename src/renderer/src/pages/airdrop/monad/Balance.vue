<template>
  <div class="min-h-[500px]">
    <div class="flex gap-1.5">
      <n-input v-model:value="address" class="w-[400px]" placeholder="钱包地址"> </n-input>
      <n-button type="primary" ghost :loading="loading" @click="getMonadBalance">查询</n-button>
    </div>
    <div v-if="balance > 0" class="flex items-center mt-1.5">
      <span>余额：{{ balance }} MON</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { getChainBalance } from '@/utils/app'
import { ref } from 'vue'

const address = ref('0x4B28fbAe0FCe3FD4505F9255e1E867B6E3cf4795')
const balance = ref(0)
const loading = ref(false)

const getMonadBalance = async () => {
  balance.value = 0
  loading.value = true
  balance.value = await getChainBalance('https://testnet-rpc.monad.xyz', address.value)
  loading.value = false
}
</script>
