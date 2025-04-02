import { IpcMainEvent } from 'electron'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { Keypair } from '@solana/web3.js'
import Cron from 'node-cron'
import { DePIN } from './index'
import { electronStore } from '../../store'
import { Flow3Account } from '../../../types/account'
import moment from 'moment'
import { sleep } from '../../utils/common'
const message = `Please sign this message to connect your wallet to Flow 3 and verifying your ownership only.`
export default class Flow3 extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'Flow3', {
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
  async getToken(account: Flow3Account) {
    this.logger(`获取Flow3 ${account.address}的token`)
    const wallet = Keypair.fromSecretKey(
      bs58.decode(account.privateKey as string)
    )
    const signature = bs58.encode(
      nacl.sign.detached(Buffer.from(message), new Uint8Array(wallet.secretKey))
    )
    const { headers, httpsAgent } = await this.getHeaders(account)
    const errorMsg = `获取Flow3 ${account.address}的token失败`

    try {
      const {
        data: { accessToken }
      } = await this.request.post<{
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
      account.token = accessToken
      this.updateAccount(account)
      this.logger(`获取Flow3 ${account.address}的token成功`)
    } catch (error: any) {
      this.logger(`${errorMsg}:${error.message}`)
      throw error
    }
  }
  async shareBandWidth(account: Flow3Account) {
    this.logger(`共享Flow3 ${account.address}的带宽`)
    this.requestWithRetry(
      async () => {
        const { headers, httpsAgent } = await this.getHeaders(account)
        await this.request.post<{
          statusCode: number
        }>('/api/v1/bandwidth', {}, { headers, httpsAgent })
        account.lastRun = new Date(this.now)
        account.message = '共享带宽成功'
        this.updateAccount(account)
        this.logger(`共享Flow3 ${account.address}的带宽成功`)
      },
      async () => {
        await this.getToken(account)
      }
    )
  }
  /**
   * https://api.flow3.tech/api/v1/tasks/stats GET
   * {
      "statusCode": 200,
      "message": "Get task stats successfully",
      "data": {
          "totalRewardPoint": "6950.00000000",
          "totalReferralRewardPoint": 0,
          "totalBandwidthReward": 0,
          "totalTaskRewardPoint": "7750.00000000"
      }
    }
   */
  async twitterTask(account: Flow3Account) {
    this.logger(`开始推特任务 ${account.address}`)
    this.requestWithRetry(
      async () => {
        const { headers, httpsAgent } = await this.getHeaders(account)
        const { statusCode, data } = await this.request.post<{
          statusCode: number
          data: {
            taskId: number
            status: number
          }[]
        }>('/v1/tasks/', {}, { headers, httpsAgent })
        if (statusCode === 200) {
          const availableTasks = data.filter((item) => item.status === 0)
          if (availableTasks.length > 0) {
            this.logger(
              `推特任务 ${availableTasks.map((item) => item.taskId).join('、')} 可完成`
            )
            for (const task of availableTasks) {
              this.logger(`开始完成推特任务 ${task.taskId}`)
              await this.request.post<{
                statusCode: number
              }>(
                `/v1/tasks/${task.taskId}/complete`,
                {},
                { headers, httpsAgent }
              )
              this.logger(`推特任务 ${task.taskId} 完成`)
              await sleep(Math.random() * 3)
            }
          }
        }
      },
      async () => {
        await this.getToken(account)
      }
    )
  }
  async dailyTask(account: Flow3Account) {
    const lastDay = moment(account.lastDailyTask).day()
    const today = moment(new Date(this.now)).day()
    if (
      (!account.lastDailyTask || today - lastDay > 0) &&
      account.hasDailyTask
    ) {
      this.logger(`开始日常签到 ${account.address}`)
      this.requestWithRetry(
        async () => {
          const { headers, httpsAgent } = await this.getHeaders(account)
          const { data } = await this.request.get<{
            data: { taskId: number; status: number }[]
          }>('/v1/tasks/daily', {
            headers,
            httpsAgent
          })
          const availableDailyTasks = data.filter(
            (item) => Number(item.status) === 0
          )
          if (availableDailyTasks.length > 0) {
            this.logger(
              `日常签到任务 ${availableDailyTasks.map((item) => item.taskId).join('、')} 可完成`
            )
            await this.request.post<{
              statusCode: number
            }>(`/api/v1/tasks/complete-daily`, {}, { headers, httpsAgent })
            account.message = '日常签到任务完成'
            account.lastDailyTask = new Date(this.now)
            account.hasDailyTask = Boolean(availableDailyTasks.length - 1)
          } else {
            account.hasDailyTask = false
          }
          this.updateAccount(account)
        },
        async () => {
          await this.getToken(account)
        }
      )
    }
  }
  async getPoint(account: Flow3Account) {
    this.logger(`获取Flow3 ${account.address}的积分`)
    this.requestWithRetry(
      async () => {
        const { headers, httpsAgent } = await this.getHeaders(account)
        const {
          data: { totalEarningPoint, todayEarningPoint }
        } = await this.request.get<{
          statusCode: number
          data: { totalEarningPoint: number; todayEarningPoint: number }
        }>(`/api/v1/point/info`, { headers, httpsAgent })
        this.logger(
          `查询Flow3 ${account.address}积分成功==>总积分：${totalEarningPoint};今日积分：${todayEarningPoint}`
        )
        account.todayEarningPoint = todayEarningPoint
        account.totalEarningPoint = totalEarningPoint
        account.message = '查询积分成功'
        this.updateAccount(account)
      },
      async () => {
        await this.getToken(account)
      }
    )
  }
  async processKeepAlive(account: Flow3Account) {
    await this.shareBandWidth(account)
    await this.getPoint(account)
  }
  async processDaily(account: Flow3Account) {
    await Promise.all([
      this.dailyTask(account),
      this.twitterTask(account),
      this.getPoint(account)
    ])
  }
  async run() {
    this.preRun()
    const { inviteCode } = electronStore.get('flow3')
    if (!inviteCode) {
      this.stop()
      return this.toast('缺失参数：邀请码')
    }
    this.cronTasks = [
      Cron.schedule('0 * * * * *', () => {
        const { wallets } = electronStore.get('flow3')
        for (const account of wallets) {
          if (account.privateKey) {
            this.queue.add(async () => {
              await this.processKeepAlive(account)
            })
          }
        }
      }),
      Cron.schedule('0 0 10 * * *', () => {
        const { wallets } = electronStore.get('flow3')
        for (const account of wallets) {
          if (account.privateKey) {
            this.queue.add(async () => {
              await this.processDaily(account)
            })
          }
        }
      })
    ]
  }
}
