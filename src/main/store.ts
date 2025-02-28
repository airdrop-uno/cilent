import ElectronStore from 'electron-store'
import os from 'os'
import { app } from 'electron'
import {
  Account,
  StorkAccount,
  HumanityAccount,
  VoltixAccount,
  NodeGoAccount,
  DawnAccount,
  GradientAccount,
  ExeosAccount,
  PinAIAccount,
  OpenLoopAccount,
  DePinedAccount,
  ParasailAccount,
  Flow3Account,
  HaioAccount,
  MonadScoreWallet
} from '../types/account'

export interface StaticProxyItem {
  url: string
  status: number
  message?: string
  protocol?: string
  username?: string
  password?: string
  host?: string
  port?: string | number
}

export interface Store {
  userDirectory: string
  chromeExecutablePath: string
  recaptchaToken: string
  smsActiveApiKey: string
  address: string
  staticProxy: StaticProxyItem[]
  accounts: Account[]
  storkAccounts: StorkAccount[]
  gmailAccounts: any[]
  humanityAccounts: HumanityAccount[]
  voltixAccounts: VoltixAccount[]
  nodeGoAccounts: NodeGoAccount[]
  dawnAccounts: DawnAccount[]
  gradientAccounts: GradientAccount[]
  exeosAccounts: ExeosAccount[]
  pinAIAccounts: PinAIAccount[]
  openLoopAccounts: OpenLoopAccount[]
  dePinedAccounts: DePinedAccount[]
  monadScore: {
    rootWalletAddress: string
    referralCode: string
    concurrency: number
    proxyMode: string
    proxyApiUrl: string
    wallets: MonadScoreWallet[]
  }
  parasailAccounts: ParasailAccount[]
  haio: {
    referralCode: string
    accounts: HaioAccount[]
  }
  flow3: {
    wallets: Flow3Account[]
    concurrency: number
    proxyMode: string
    proxyApiUrl: string
  }
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
    },
    nodeGoAccounts: {
      type: 'array',
      default: []
    },
    dawnAccounts: {
      type: 'array',
      default: []
    },
    gradientAccounts: {
      type: 'array',
      default: []
    },
    exeosAccounts: {
      type: 'array',
      default: []
    },
    pinAIAccounts: {
      type: 'array',
      default: []
    },
    openLoopAccounts: {
      type: 'array',
      default: []
    },
    dePinedAccounts: {
      type: 'array',
      default: []
    },
    monadScore: {
      type: 'object',
      default: {
        referralCode: '',
        wallets: [],
        rootWalletAddress: '',
        concurrency: os.cpus().length
      }
    },
    parasailAccounts: {
      type: 'array',
      default: []
    },
    haio: {
      type: 'object',
      default: {
        referralCode: '',
        accounts: []
      }
    },
    staticProxy: {
      type: 'array',
      default: []
    },
    flow3: {
      type: 'object',
      default: {
        wallets: [],
        concurrency: os.cpus().length,
        proxyMode: 'None',
        proxyApiUrl: ''
      }
    }
  }
})
