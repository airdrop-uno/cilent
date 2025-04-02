import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/home/index.vue')
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('@/pages/account/index.vue')
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@/pages/tools/index.vue')
  },
  {
    path: '/faucet',
    name: 'Faucet',
    redirect: '/faucet/monad',
    component: () => import('@/pages/faucet/index.vue'),
    children: [
      {
        path: 'goerli',
        name: 'Goerli',
        component: () => import('@/pages/faucet/Goerli.vue')
      },
      {
        path: 'sepolia',
        name: 'Sepolia',
        component: () => import('@/pages/faucet/Sepolia.vue')
      }
    ]
  },

  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/Profile.vue')
  },
  {
    path: '/airdrop',
    name: 'Airdrop',
    component: () => import('@/pages/airdrop/index.vue'),
    children: [
      {
        path: '/airdrop/monad',
        name: 'Monad',
        component: () => import('@/pages/airdrop/monad/index.vue')
      }
    ]
  },
  {
    path: '/depin',
    name: 'Depin',
    component: () => import('@/pages/depin/index.vue'),
    children: [
      {
        path: '/depin/stork',
        name: 'Stork',
        component: () => import('@/pages/depin/stork.vue')
      },
      {
        path: '/depin/nodeGo',
        name: 'NodeGo',
        component: () => import('@/pages/depin/nodeGo.vue')
      },
      {
        path: '/depin/monadScore',
        name: 'MonadScore',
        component: () => import('@/pages/depin/monadScore.vue')
      },
      {
        path: '/depin/flow3',
        name: 'Flow3',
        component: () => import('@/pages/depin/flow3.vue')
      }
    ]
  },
  {
    path: '/system',
    name: 'System',
    component: () => import('@renderer/pages/system/index.vue'),
    children: [
      {
        path: '/system/proxy',
        name: 'IP',
        component: () => import('@renderer/pages/system/proxy.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 创建一个 Promise 来追踪数据加载状态
// let dataLoadPromise: Promise<void> | null = null

// 初始化数据加载
// const initDataLoad = (): Promise<void> => {
//   if (!dataLoadPromise) {
//     dataLoadPromise = new Promise((resolve) => {
//       window.electron.ipcRenderer.send('loadData')
//       window.electron.ipcRenderer.on('loadDataReply', (_event, { data, status }) => {
//         console.log('loadDataReply', data, status)
//         const appStore = useAppStore()
//         if (status) {
//           appStore.address = data.address
//           appStore.accounts = data.accounts
//           resolve()
//         }
//       })
//     })
//   }
//   return dataLoadPromise
// }
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
