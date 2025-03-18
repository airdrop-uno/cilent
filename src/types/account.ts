export interface Wallet {
  address?: string
  privateKey?: string
  mnemonic?: string
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

export interface VoltixAccount {
  address: string
  token: string
  proxy?: string
  integral: number
  category: 'ONE' | 'DAILY'
}
