import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { AxiosHeaders } from 'axios'
import os from 'os'
import PQueue from 'p-queue'
import { IpcMainEvent } from 'electron'
import { Worker } from 'node:worker_threads'
import { TokenManager } from './TokenManager'
import { Request } from '../base/request'
import { ExecuteStatus } from '../../../types/depin'
import { electronStore } from '../../store'
import { Account } from '../../../types/account'
import { getProxyAgent } from '../../utils/depin'
import { storkWorkerScript } from '../../workers/stork'

export const StorkBaseURL = 'https://app-api.jp.stork-oracle.network/v1'
export const request = new Request(StorkBaseURL)
interface UserData {
  stats: {
    stork_signed_prices_valid_count: number
    stork_signed_prices_invalid_count: number
  }
}

interface SignedPricesData {
  [key: string]: {
    price: number
    timestamped_signature: { msg_hash: string; timestamp: number }
  }
}

export interface SignedPrice {
  asset: string
  msg_hash: string
  timestamp: string
  price: number
}

const userPool = new CognitoUserPool({
  UserPoolId: 'ap-northeast-1_M22I44OpC',
  ClientId: '5msns4n49hmg3dftp2tp1t2iuh'
})

export class Stork {
  static headers: Partial<AxiosHeaders> = {
    'Content-Type': 'application/json',
    Origin: 'chrome-extension://knnliglhgkmlblppdejchidfihjnockl',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
  }
  private cognitoUserPool: CognitoUserPool = userPool
  private intervalSeconds: number = 10 * 1000
  public status: ExecuteStatus = ExecuteStatus.PENDING
  private event!: IpcMainEvent
  public availableWorkers: number = os.cpus().length / 2
  private queue!: PQueue
  private executeMap: Record<string, number> = {}
  constructor(event: IpcMainEvent) {
    this.event = event
    this.queue = new PQueue({ concurrency: Math.min(os.cpus().length, 5) })
  }
  logger(type: 'info' | 'error', message: string) {
    this.event.reply('storkLog', { type, message })
  }
  public setStatus(status: ExecuteStatus) {
    this.status = status
  }
  public setWorkers(workers: number) {
    this.availableWorkers = workers
  }
  public setIntervalSeconds(intervalSeconds: number) {
    this.intervalSeconds = intervalSeconds
  }
  public async checkPassword(
    email: string,
    password: string
  ): Promise<boolean> {
    const tokenManager = new TokenManager(email, password, this.cognitoUserPool)
    await tokenManager.getValidToken()
    return tokenManager.token?.isAuthenticated || false
  }
  public static getHeaders(
    token: string,
    options: Partial<Account>
  ): { headers: AxiosHeaders; agent: any } {
    const { proxy, userAgent } = options
    const headers = { ...this.headers } as AxiosHeaders
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    if (userAgent) {
      headers['User-Agent'] = userAgent
    }
    const agent = getProxyAgent(proxy as string) as any
    return { headers, agent }
  }
  public async getData<T>(
    url: string,
    token: string,
    options: Partial<Account>
  ): Promise<T> {
    const { headers, agent } = Stork.getHeaders(token, options)
    const { data } = await request.get<{ data: T }>(url, {
      headers,
      httpsAgent: agent
    })
    return data as T
  }
  private async getSignedPrices(
    tokenManager: TokenManager,
    options: Partial<Account>
  ): Promise<SignedPrice[]> {
    const token = tokenManager.token?.accessToken
    if (!token) return []
    const signedPricesData = await this.getData<SignedPricesData>(
      '/stork_signed_prices',
      token,
      options
    )
    const signedPrices = Object.entries(signedPricesData).map(
      ([asset, assetData]) => {
        return {
          asset,
          msg_hash: assetData.timestamped_signature.msg_hash,
          timestamp: new Date(
            assetData.timestamped_signature.timestamp / 1000000
          ).toISOString(),
          ...assetData
        }
      }
    )
    return signedPrices
  }

  createWorker(priceData: SignedPrice, token: string, proxy?: string) {
    const worker = new Worker(storkWorkerScript, {
      eval: true,
      workerData: { priceData, proxy, token }
    })
    return new Promise((resolve) => {
      worker.on('message', resolve)
      worker.on('error', (error) => {
        console.error(error)
        this.event.reply('toastMessage', {
          status: 'error',
          message: `执行错误:${error.message}`
        })
        this.setStatus(ExecuteStatus.STOPPED)
        resolve({ success: false, error: error.message })
      })
      worker.on('exit', () =>
        resolve({ success: false, error: 'Worker exited' })
      )
    })
  }
  async startVerify(tokenManager: TokenManager, options: Partial<Account>) {
    if (this.status !== ExecuteStatus.RUNNING) return
    try {
      const token = tokenManager.token?.accessToken
      if (!token) return
      const { proxy } = options
      const userData = await this.getData<UserData>('/me', token, options)
      if (!userData || !userData.stats)
        throw new Error('无法获取初始用户统计信息')
      const signedPrices = await this.getSignedPrices(tokenManager, options)
      if (!signedPrices || !signedPrices.length)
        throw new Error('没有数据需要验证')
      const workers: any[] = []
      const chunkSize = Math.ceil(signedPrices.length / this.availableWorkers)
      const batches: Array<typeof signedPrices> = []
      for (let i = 0; i < signedPrices.length; i += chunkSize) {
        batches.push(signedPrices.slice(i, i + chunkSize))
      }
      for (
        let i = 0;
        i < Math.min(batches.length, this.availableWorkers);
        i++
      ) {
        const batch = batches[i]
        for (const priceData of batch) {
          workers.push(this.createWorker(priceData, token, proxy))
        }
      }
      const results = await Promise.all(workers)
      const currentTimeValid = results.filter((r) => r.success).length
      const updatedUserData = await this.getData<UserData>(
        '/me',
        token,
        options
      )
      const totalValid =
        updatedUserData.stats.stork_signed_prices_valid_count || 0
      const totalInvalid =
        updatedUserData.stats.stork_signed_prices_invalid_count || 0
      this.logger(
        'info',
        `${options.email} 执行完成，验证数量:${signedPrices.length}，成功数量:${currentTimeValid}，失败数量:${totalInvalid}，有效数量:${totalValid}`
      )
      const accounts = electronStore.get('storkAccounts')
      const index = accounts.findIndex(
        (account) => account.email === options.email
      )
      accounts[index].validCount = totalValid
      electronStore.set('storkAccounts', accounts)
      this.event.reply('updateAccounts', accounts)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  async run() {
    this.setStatus(ExecuteStatus.RUNNING)
    setInterval(() => {
      if (this.status !== ExecuteStatus.RUNNING) return
      const storkAccounts = electronStore.get('storkAccounts')
      for (const account of storkAccounts) {
        const { email, password } = account
        const lastTime = this.executeMap[email]
        if (!lastTime || Date.now() - lastTime >= this.intervalSeconds) {
          this.queue.add(async () => {
            const tokenManager = new TokenManager(
              email,
              password,
              this.cognitoUserPool
            )
            await tokenManager.getValidToken()
            await this.startVerify(tokenManager, account)
          })
        }
      }
    }, this.intervalSeconds)
  }
}
