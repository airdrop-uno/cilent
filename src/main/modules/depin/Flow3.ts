import { IpcMainEvent } from 'electron'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { Keypair } from '@solana/web3.js'
import { DePIN } from './index'
import { electronStore } from '../../store'
import { Flow3Account } from '../../../types/account'
const message = `Please sign this message to connect your wallet to Flow 3 and verifying your ownership only.`
export default class Flow3 extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'Flow3', {
      intervalSeconds: 60 * 1000,
      baseURL: 'https://api.flow3.tech',
      defaultHeaders: {
        Origin: 'chrome-extension://lhmminnoafalclkgcbokfcngkocoffcp'
      }
    })
  }
  updateAccount(account: Flow3Account) {
    const { wallets } = electronStore.get('flow3')
    const index = wallets.findIndex((item) => item.address === account.address)
    if (index !== -1) {
      wallets[index] = account
    }
    electronStore.set('flow3.wallets', wallets)
  }
  async getAccessToken(account: Flow3Account) {
    this.logger(`获取Flow3 ${account.address}的accessToken`)
    const wallet = Keypair.fromSecretKey(
      bs58.decode(account.privateKey as string)
    )
    const signature = bs58.encode(
      nacl.sign.detached(Buffer.from(message), new Uint8Array(wallet.secretKey))
    )
    const { headers, httpsAgent } = await this.getHeaders(account)
    const errorMsg = `获取Flow3 ${account.address}的accessToken失败`

    try {
      const {
        statusCode,
        data: { accessToken }
      } = await this.request.post<{
        statusCode: number
        data: { accessToken: string }
      }>(
        '/v1/user/login',
        {
          message: message,
          walletAddress: wallet.publicKey.toBase58(),
          signature: signature
        },
        { headers, httpsAgent }
      )
      if (statusCode === 200) {
        account.accessToken = accessToken
        this.updateAccount(account)
        this.logger(`获取Flow3 ${account.address}的accessToken成功`)
      } else {
        this.logger(`errorMsg`)
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      this.logger(`${errorMsg}:${error.message}`)
      throw error
    }
  }
  async shareBandWidth(account: Flow3Account) {
    this.logger(`共享Flow3 ${account.address}的带宽`)
    const { headers, httpsAgent } = await this.getHeaders(account)
    try {
      const { statusCode } = await this.request.post<{
        statusCode: number
      }>('/api/v1/bandwidth', {}, { headers, httpsAgent })
      if (statusCode === 200) {
        this.logger(`共享Flow3 ${account.address}的带宽成功`)
      } else {
        this.logger(`共享Flow3 ${account.address}的带宽失败`)
        throw new Error(`共享Flow3 ${account.address}的带宽失败`)
      }
    } catch (error: any) {
      this.logger(`共享Flow3 ${account.address}的带宽失败:${error.message}`)
      throw error
    }
  }

  async getPoint(account: Flow3Account) {
    this.logger(`获取Flow3 ${account.address}的积分`)
    const { headers, httpsAgent } = await this.getHeaders(account)
    const errorMsg = `获取Flow3 ${account.address}的积分失败`
    try {
      const {
        statusCode,
        data: { totalEarningPoint, todayEarningPoint }
      } = await this.request.get<{
        statusCode: number
        data: { totalEarningPoint: number; todayEarningPoint: number }
      }>(`/api/v1/point/info`, { headers, httpsAgent })
      if (statusCode === 200) {
        this.logger(
          `查询Flow3 ${account.address}积分成功==>总积分：${totalEarningPoint};今日积分：${todayEarningPoint}`
        )
        account.todayEarningPoint = todayEarningPoint
        account.totalEarningPoint = totalEarningPoint
        account.message = '查询积分成功'
      } else {
        this.logger(`${errorMsg}`)
        account.message = '查询积分失败'
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      this.logger(`${errorMsg}:${error.message}`)
      throw error
    } finally {
      this.updateAccount(account)
    }
  }
  async processKeepAlive(account: Flow3Account) {
    try {
      if (!account.accessToken) await this.getAccessToken(account)
      await this.shareBandWidth(account)
      account.lastRun = new Date()
      account.status = '带宽共享中'
      this.updateAccount(account)
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        this.logger(`${account.address}的Token已过期，正在尝试重新登录...`)
        await this.getAccessToken(account)
        await this.processKeepAlive(account)
      }
    }
  }
  async run() {
    this.preRun()
    this.timer = setInterval(() => {
      const { wallets } = electronStore.get('flow3')
      for (const account of wallets) {
        if (account.privateKey) {
          this.queue.add(async () => {
            await this.processKeepAlive(account)
          })
        }
      }
    }, this.intervalSeconds)
  }
}
