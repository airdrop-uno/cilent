import { Moment } from 'moment'

export interface Wallet {
  address: string
  privateKey: string
  mnemonic?: string
}

export type ProxyMode = 'None' | 'Static' | 'Dynamic'

export interface UniqueWallet extends Wallet {
  userAgent?: string
  proxy?: string
}
export interface MonadScoreWallet extends UniqueWallet {
  referralCode?: string
  points?: number
  registered?: boolean
  claimedTasks?: string[]
  taskCompleted?: number
  lastRun?: string
  message?: string
  loginToken?: string
  token?: string
}
export interface Email {
  email: string
  password: string
}
export interface Account extends Email, Wallet {
  proxy?: string
  userAgent?: string
  twitter?: string
  telegram?: string
  discord?: string
  storkPassword?: string
  enableStork?: boolean
}

export interface StorkAccount extends Email {
  proxy?: string
  token?: string
  expiresAt?: number
  validCount?: number
}
export interface HumanityAccount extends Wallet {
  integral: number
}

export interface TokenAccount {
  email: string
  token: string
  proxy: string
  ua: string
}

export interface VoltixAccount {
  address: string
  token: string
  proxy?: string
  integral: number
  category: 'ONE' | 'DAILY'
}
export type NodeGoAccount = TokenAccount

export type DawnAccount = TokenAccount
export type PinAIAccount = TokenAccount
export type OpenLoopAccount = TokenAccount & {
  password: string
  expireTime: number
}

export type DePinedAccount = TokenAccount & { points: number }
export interface GradientAccount {
  email: string
  password: string
  proxy?: string
  ua: string
}
export interface ExeosAccount extends TokenAccount {
  extensionId: string
  points: number
  referralPoints: number
  earningsTotal: number
  totalRewards: number
}

export interface ParasailAccount extends Wallet {
  token: string
  userAgent?: string
  proxy?: string
}

export interface Flow3Account extends Wallet {
  token?: string
  userAgent?: string
  proxy?: string
  message?: string
  totalEarningPoint?: number
  todayEarningPoint?: number
  referralEarningPoint?: number
  lastRun?: string
  lastDailyTask?: string
  hasDailyTask?: boolean
  twitterTaskFinishedCount?: number
}
export interface HaioAccount extends Wallet {
  token: string
  userAgent?: string
  proxy?: string
  address: string
  privateKey: string
}
export interface IncentivAccount extends Wallet {
  token: string
  registered: boolean
  nextFaucetTimestamp: number
}
