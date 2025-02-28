<template>
  <n-log
    :rows="30"
    :log="logs.join('\n')"
    :font-size="14"
    trim
    language="text"
  />
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const logs = ref<string[]>([])
const props = defineProps<{
  eventLog: string
}>()
onMounted(() => {
  console.log(props.eventLog)
  window.electron.ipcRenderer.on(
    props.eventLog,
    (_event, log: { type: string; message: string }) => {
      logs.value.push(`[${new Date().toLocaleString()}] ${log.message}`)
      if (logs.value.length > 1000) {
        logs.value = logs.value.slice(-1000)
      }
    }
  )
})
</script>
