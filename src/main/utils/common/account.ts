import { ethers, InterfaceAbi } from 'ethers'
import os from 'os'
import { Account, Wallet } from '../../../types/account'
import PQueue from 'p-queue'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

export const createAccount = async (amount: number): Promise<Account[]> => {
  const accounts: Account[] = []
  const queue = new PQueue({ concurrency: os.cpus().length - 2 })
  for (let i = 0; i < amount; i++) {
    queue.add(() => {
      const account = ethers.Wallet.createRandom()
      accounts.push({
        address: account.address,
        privateKey: account.privateKey,
        mnemonic: account.mnemonic?.phrase || '',
        email: '',
        password: ''
      })
    })
  }
  await queue.onIdle()
  return accounts
}

export const createSolanaWallet = async (amount: number): Promise<Wallet[]> => {
  const walets: Wallet[] = []
  const queue = new PQueue({ concurrency: os.cpus().length - 2 })
  for (let i = 0; i < amount; i++) {
    queue.add(() => {
      const pair = Keypair.generate()
      walets.push({
        address: pair.publicKey.toBase58(),
        privateKey: bs58.encode(pair.secretKey)
      })
    })
  }
  await queue.onIdle()
  return walets
}

export const getBalance = async (provider: string, address: string) => {
  const rpcProvider = new ethers.JsonRpcProvider(provider)
  const balance = await rpcProvider.getBalance(address)
  return ethers.formatEther(balance.valueOf())
}

export const createContract = (
  address: string,
  abi: InterfaceAbi,
  provider: string
) => {
  const rpcProvider = new ethers.JsonRpcProvider(provider)
  return new ethers.Contract(address, abi, rpcProvider)
}

export const callContract = async (
  _provider: string,
  privateKey: string,
  _contract: string,
  abi: InterfaceAbi,
  methodName: string,
  params: any[]
) => {
  const provider = new ethers.JsonRpcProvider(_provider)
  const account = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(_contract, abi, account)
  const tx = await contract[methodName](...params)
  const result = await tx.wait()
  return result
}
