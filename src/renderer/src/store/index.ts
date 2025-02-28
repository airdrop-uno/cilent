import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => ({
  address: '',
  wallets: []
}))
