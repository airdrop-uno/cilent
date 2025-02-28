import { ethers, InterfaceAbi } from 'ethers'
import { Account } from '../../../types/account'

export const createAccount = (amount: number): Account[] => {
  const accounts: Account[] = []
  for (let i = 0; i < amount; i++) {
    const account = ethers.Wallet.createRandom()
    accounts.push({
      address: account.address,
      privateKey: account.privateKey,
      mnemonic: account.mnemonic?.phrase || '',
      email: '',
      password: ''
    })
  }
  return accounts
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
