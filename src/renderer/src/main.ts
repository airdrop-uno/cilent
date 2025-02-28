import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import App from './App.vue'
import './assets/main.css'
import router from './router'
createApp(App).use(router).use(createPinia()).use(naive).mount('#app')

declare global {
  interface Window {
    $message: any
  }
}
