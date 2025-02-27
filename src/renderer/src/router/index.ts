import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'monad',
    component: () => import('@renderer/pages/Monad.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
