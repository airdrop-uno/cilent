import { ethers } from 'ethers'

const rpcUrl = 'https://testnet.gte.xyz/api/rpc'
export default class MegaETH {
  protected provider: ethers.JsonRpcProvider
  protected swapContract!: ethers.Contract
  constructor() {
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
  }
  setSwapContract(address: string, abi: any) {
    this.swapContract = new ethers.Contract(address, abi, this.provider)
  }
}
