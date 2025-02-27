import { ethers } from 'ethers'

export interface Wallet {
  address: string
  privateKey: string
  mnemonic: string
}
export const createWallet = (amount: number): Wallet[] => {
  const wallets: Wallet[] = []
  for (let i = 0; i < amount; i++) {
    const wallet = ethers.Wallet.createRandom()
    wallets.push({
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || ''
    })
  }
  return wallets
}
