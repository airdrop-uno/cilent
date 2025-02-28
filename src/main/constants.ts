export enum MetaMask {
  password = '12345678password'
}
export const MM_HOME_REGEX = 'chrome-extension://[a-z]+/home.html'

export interface User {
  address: string
  privateKey: string
  mnemonic: string
  email?: string
  password?: string
  proxy?: string
  userAgent?: string
}
