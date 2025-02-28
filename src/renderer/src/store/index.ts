import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => ({
  globalLoading: false,
  loadingText: '',
  isActive: false,
  activeKey: 'Home',
  userDirectory: '',
  chromeExecutablePath: '',
  recaptchaToken: '',
  smsActiveApiKey: '',
  address: '',
  accounts: []
}))
