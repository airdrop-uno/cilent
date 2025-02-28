import { useAppStore } from '@renderer/store'
import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'monad',
    component: () => import('@renderer/pages/Monad.vue')
  },
  // {
  //   path: '/login',
  //   name: 'login',
  //   component: () => import('@renderer/pages/Login.vue')
  // }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 创建一个 Promise 来追踪数据加载状态
let dataLoadPromise: Promise<void> | null = null

// 初始化数据加载
const initDataLoad = (): Promise<void> => {
  if (!dataLoadPromise) {
    dataLoadPromise = new Promise((resolve) => {
      window.electron.ipcRenderer.send('loadData')
      window.electron.ipcRenderer.on('loadDataReply', (_event, { data, status }) => {
        console.log('loadDataReply', data, status)
        const appStore = useAppStore()
        if (status) {
          appStore.address = data.address
          appStore.wallets = data.wallets
          resolve()
        }
      })
    })
  }
  return dataLoadPromise
}
// 根据store判断是否需要跳转
// router.beforeEach(async (to, from, next) => {
//   try {
//     await initDataLoad()
//     const appStore = useAppStore()
//     if (to.path !== '/login' && !appStore.address) {
//       next({ path: '/login' })
//     } else {
//       next()
//     }
//   } catch (error) {
//     console.error(error)
//   }
// })
export default router
