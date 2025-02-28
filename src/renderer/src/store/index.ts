import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => ({
  globalLoading: false,
  userDirectory: '',
  chromeExecutablePath: '',
  recaptchaToken: '',
  smsActiveApiKey: '',
  address: '',
  accounts: []
}))
