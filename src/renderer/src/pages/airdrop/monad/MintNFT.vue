<template>
  <div class="min-h-[200px]">
    <n-button type="primary" ghost @click="mint">Mint</n-button>
  </div>
</template>
<script lang="ts" setup>
const mint = () => {
  window.electron.ipcRenderer.send('mintMonadFreeNFT', {
    headless: false,
    seed: 'flat one hair weekend menu search peasant witness taxi travel quote snac'
  })
}
</script>
