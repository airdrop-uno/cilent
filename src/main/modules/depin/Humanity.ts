import type { IpcMainEvent } from 'electron'
import { ethers } from 'ethers'
import PQueue from 'p-queue'
import os from 'os'
import {
  contractAddress,
  RPC,
  contractABI,
  chainId,
  tokenContractAddress,
  tokenContractABI
} from '../../config/contract/humanity'
import { electronStore } from '../../store'
const provider = new ethers.JsonRpcProvider(RPC)

const tokenContract = new ethers.Contract(
  tokenContractAddress,
  tokenContractABI,
  provider
)
export default class Humanity {
  private event: IpcMainEvent
  private isRunning = false
  private intervalSeconds = 1000 * 60 * 60 * 6
  private queue = new PQueue({ concurrency: os.cpus().length })
  constructor(event: IpcMainEvent) {
    this.event = event
  }
  static async queryIntegral(
    address: string
  ): Promise<{ address: string; integral: string }> {
    const integral = await tokenContract.balanceOf(address)
    return {
      address,
      integral: integral.toString()
    }
  }
  async claim(privateKey: string) {
    if (!this.isRunning) return
    const wallet = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, contractABI, wallet)
    const gasPrice = await provider.getFeeData()
    const gasEstimate = await contract.claimReward.estimateGas()
    const tx = await contract.claimReward({
      gasLimit: gasEstimate,
      gasPrice: gasPrice.gasPrice,
      chainId
    })
    const receipt = await tx.wait()
    const integral = await Humanity.queryIntegral(wallet.address as string)
    const accounts = electronStore.get('humanityAccounts')
    const index = accounts.findIndex((item) => item.privateKey === privateKey)
    if (index !== -1) {
      accounts[index].integral = parseInt(integral.integral)
      accounts[index].address = wallet.address
    }
    electronStore.set('humanityAccounts', accounts)
    this.event.reply('updateHumanityAccounts', accounts)
    this.event.reply('humanityLog', {
      type: 'success',
      message: `claim success: ${wallet.address}; 当前积分: ${integral.integral}; 6小时后继续执行...`
    })
    setTimeout(() => {
      this.claim(privateKey)
    }, this.intervalSeconds)
    return receipt
  }
  async run() {
    if (this.isRunning)
      this.event.reply('toastMessage', {
        status: 'error',
        message: 'Humanity is already running'
      })
    this.isRunning = true
    const accounts = electronStore.get('humanityAccounts')
    for (const account of accounts) {
      this.queue.add(async () => {
        try {
          await this.claim(account.privateKey as string)
        } catch (error) {
          this.event.reply('humanityLog', {
            type: 'error',
            message: `claim failed: ${account.address}\n${(error as any).message}`
          })
        }
      })
    }
  }
  stop() {
    this.isRunning = false
    this.queue.clear()
  }
}
