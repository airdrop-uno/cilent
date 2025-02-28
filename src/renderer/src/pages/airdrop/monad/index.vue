<template>
  <n-card title="Monad 交互">
    <n-tabs type="line" animated>
      <n-tab-pane name="balances" tab="余额查询"> <MonadBalance /></n-tab-pane>
      <n-tab-pane name="faucet" disabled tab="领水"> <MonadFaucet /> </n-tab-pane>
      <n-tab-pane name="mint" disabled tab="Mint NFT">
        <MonadMintNFT />
      </n-tab-pane>
      <n-tab-pane name="domain" disabled tab="购买域名"> 购买域名 </n-tab-pane>
    </n-tabs>
  </n-card>
</template>
<script lang="ts" setup>
import MonadFaucet from './Faucet.vue'
import MonadBalance from './Balance.vue'
import MonadMintNFT from './MintNFT.vue'
</script>
