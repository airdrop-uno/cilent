import ElectronStore from 'electron-store'
import { app } from 'electron'
import {
  Account,
  StorkAccount,
  HumanityAccount,
  VoltixAccount
} from '../types/account'

export interface Store {
  userDirectory: string
  chromeExecutablePath: string
  recaptchaToken: string
  smsActiveApiKey: string
  address: string
  accounts: Account[]
  storkAccounts: StorkAccount[]
  gmailAccounts: any[]
  humanityAccounts: HumanityAccount[]
  voltixAccounts: VoltixAccount[]
}
export const electronStore = new ElectronStore<Store>({
  schema: {
    userDirectory: {
      type: 'string',
      default: app.getPath('userData')
    },
    chromeExecutablePath: {
      type: 'string',
      default: ''
    },
    recaptchaToken: {
      type: 'string',
      default: ''
    },
    smsActiveApiKey: {
      type: 'string',
      default: ''
    },
    address: {
      type: 'string',
      default: ''
    },
    accounts: {
      type: 'array',
      default: []
    },
    storkAccounts: {
      type: 'array',
      default: []
    },
    gmailAccounts: {
      type: 'array',
      default: []
    },
    humanityAccounts: {
      type: 'array',
      default: []
    },
    voltixAccounts: {
      type: 'array',
      default: []
    }
  }
})
