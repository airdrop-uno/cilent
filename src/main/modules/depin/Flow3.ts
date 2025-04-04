import { IpcMainEvent } from 'electron'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { Keypair } from '@solana/web3.js'
import { DePIN } from './index'
import { electronStore } from '../../store'
import { Flow3Account } from '../../../types/account'
import moment from 'moment'
import { sleep } from '../../utils/common'
import { getRandomUserAgent } from '../../config/userAgent'
import PQueue from 'p-queue'
const message = `Please sign this message to connect your wallet to Flow 3 and verifying your ownership only.`
export default class Flow3 extends DePIN {
  protected dailyQueue!: PQueue
  constructor(event: IpcMainEvent) {
    super(event, 'flow3', {
      baseURL: 'https://api.flow3.tech',
      defaultHeaders: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'content-type': 'application/json',
        origin: 'https://dashboard.flow3.tech',
        priority: 'u=1, i',
        referer: 'https://dashboard.flow3.tech/',
        'sec-ch-ua':
          '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        Origin: 'https://dashboard.flow3.tech'
      }
    })
    this.dailyQueue = new PQueue({ concurrency: 4, autoStart: false })
  }
  updateAccount(account: Flow3Account) {
    const { wallets } = electronStore.get('flow3')
    const index = wallets.findIndex((item) => item.address === account.address)
    if (index !== -1) {
      wallets[index] = account
    }
    electronStore.set('flow3.wallets', wallets)
    this.event.reply('updateFlow3Accounts', wallets)
  }
  async getToken(account: Flow3Account) {
    if (!account.userAgent) {
      account.userAgent = getRandomUserAgent()
    }
    this.logger(`${account.address} 获取token...`)
    const wallet = Keypair.fromSecretKey(
      bs58.decode(account.privateKey as string)
    )
    const signature = bs58.encode(
      nacl.sign.detached(Buffer.from(message), new Uint8Array(wallet.secretKey))
    )
    const { headers, httpsAgent } = await this.getHeaders(account)
    const errorMsg = `${account.address} 获取token失败`

    try {
      const { referralCode } = electronStore.get('flow3')
      const body: Record<string, string> = {
        message: message,
        walletAddress: wallet.publicKey.toBase58(),
        signature: signature
      }
      if (!account.token) {
        body.referralCode = referralCode
      }
      const {
        data: { accessToken }
      } = await this.request.post<{
        data: { accessToken: string }
      }>('/api/v1/user/login', body, { headers, httpsAgent })
      account.token = accessToken
      this.updateAccount(account)
      this.logger(`${account.address} 获取token成功`)
    } catch (error: any) {
      this.logger(`${errorMsg}:${error.message}`)
      throw error
    }
  }
  async shareBandWidth(account: Flow3Account) {
    this.logger(`${account.address} 共享带宽...`)
    await this.requestWithRetry(
      async () => {
        const { headers, httpsAgent } = await this.getHeaders(account)
        await this.request.post<{
          statusCode: number
        }>(
          '/api/v1/bandwidth',
          {
            walletAddress: account.address
          },
          {
            headers: {
              ...headers,
              Origin: 'chrome-extension://lhmminnoafalclkgcbokfcngkocoffcp'
            },
            httpsAgent
          }
        )
        account.lastRun = this.now
        account.message = '共享带宽成功'
        this.updateAccount(account)
        this.logger(`${account.address} 共享带宽成功`)
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
    if (account.twitterTaskFinishedCount === 13) {
      this.logger(`${account.address} 推特任务已完成；跳过...`)
      return
    }
    this.logger(`${account.address} 开始推特任务...`)
    await this.requestWithRetry(
      async () => {
        const { headers, httpsAgent } = await this.getHeaders(account)
        const { data } = await this.request.get<{
          data: {
            taskId: number
            status: number
            title: string
          }[]
        }>('/api/v1/tasks/', { headers, httpsAgent })
        const availableTasks = data.filter((item) => Number(item.status) !== 1)
        account.twitterTaskFinishedCount = data.length - availableTasks.length
        if (availableTasks.length > 0) {
          for (const task of availableTasks) {
            this.logger(
              `${account.address} 开始完成推特任务 ${task.title} ${task.taskId}`
            )
            await this.request.post(
              `/api/v1/tasks/${task.taskId}/complete`,
              {},
              { headers, httpsAgent }
            )
            this.logger(
              `${account.address} 推特任务 ${task.taskId}: ${task.title} 完成`
            )
            account.twitterTaskFinishedCount += 1
            await sleep(Math.random() * 3)
          }
        }
        this.updateAccount(account)
      },
      async () => {
        await this.getToken(account)
      }
    )
  }
  async dailyTask(account: Flow3Account) {
    const lastDay = account.lastDailyTask
      ? moment(account.lastDailyTask).day()
      : 31
    const today = moment.utc().day()
    if (
      (account.lastDailyTask === undefined || today - lastDay > 0) &&
      (typeof account.hasDailyTask === 'boolean' ? account.hasDailyTask : true)
    ) {
      this.logger(`${account.address} 开始日常签到...`)
      await this.requestWithRetry(
        async () => {
          const { headers, httpsAgent } = await this.getHeaders(account)
          const { data } = await this.request.get<{
            data: { taskId: number; status: number }[]
          }>('/api/v1/tasks/daily', {
            headers,
            httpsAgent
          })
          const availableDailyTasks = data.filter(
            (item) => Number(item.status) === 0
          )
          if (availableDailyTasks.length > 0) {
            this.logger(
              `${account.address} 日常签到任务 ${availableDailyTasks.map((item) => item.taskId).join('、')} 可完成`
            )
            await this.request.post<{
              statusCode: number
            }>(`/api/v1/tasks/complete-daily`, {}, { headers, httpsAgent })
            account.message = '日常签到完成'
            account.lastDailyTask = this.now
            account.hasDailyTask = Boolean(availableDailyTasks.length - 1)
            this.logger(`${account.address} 日常签到完成`)
          } else {
            account.hasDailyTask = false
          }
          this.updateAccount(account)
        },
        async () => {
          await this.getToken(account)
        }
      )
    } else {
      this.logger(`${account.address} 日常签到已完成；跳过...`)
    }
  }
  async getPoint(account: Flow3Account) {
    this.logger(`${account.address} 获取积分...`)
    await this.requestWithRetry(
      async () => {
        const { headers, httpsAgent } = await this.getHeaders(account)
        const {
          data: { totalEarningPoint, todayEarningPoint, referralEarningPoint }
        } = await this.request.get<{
          statusCode: number
          data: {
            totalEarningPoint: number
            todayEarningPoint: number
            referralEarningPoint: number
          }
        }>(`/api/v1/point/info`, {
          httpsAgent,
          headers
        })
        this.logger(
          `${account.address} 总积分：${Number(totalEarningPoint).toFixed(
            2
          )};今日积分：${Number(todayEarningPoint).toFixed(2)}`
        )
        account.todayEarningPoint = todayEarningPoint
        account.totalEarningPoint = totalEarningPoint
        account.referralEarningPoint = referralEarningPoint
        account.message = '查询积分成功'
        this.updateAccount(account)
      },
      async () => {
        await this.getToken(account)
      }
    )
  }
  async processKeepAlive(account: Flow3Account) {
    if (!account.token) {
      await this.getToken(account)
    }
    await this.shareBandWidth(account)
    await this.getPoint(account)
  }
  async processDaily(account: Flow3Account) {
    if (!account.token) {
      await this.getToken(account)
    }
    await Promise.all([this.dailyTask(account), this.twitterTask(account)])
    return this.getPoint(account)
  }
  async stop() {
    super.stop()
    this.dailyQueue.pause()
    this.dailyQueue.clear()
  }
  async run() {
    const { referralCode } = electronStore.get('flow3')
    if (!referralCode) {
      this.stop()
      return this.toast('缺失参数：邀请码')
    }
    this.preRun()
    this.dailyQueue.pause()
    this.dailyQueue.clear()

    const staticProxyList = electronStore.get('staticProxy')
    const executeDaily = async () => {
      const { wallets } = electronStore.get('flow3')
      for (const wallet of wallets) {
        this.dailyQueue.add(async () => {
          try {
            return await this.processDaily(wallet)
          } catch (error: any) {
            if (error.response?.data?.message?.includes('Already checkin')) {
              this.logger(`${wallet.address} 日常签到已完成；跳过...`)
              wallet.lastDailyTask = this.now
            } else {
              throw error
            }
          } finally {
            this.updateAccount(wallet)
          }
        })
      }
      this.dailyQueue.start()
      await this.dailyQueue.onIdle()
    }
    const executeKeepAlive = async () => {
      const { wallets } = electronStore.get('flow3')
      for (let i = 0; i < wallets.length; i++) {
        const account = wallets[i]
        account.proxy ||= staticProxyList[i % staticProxyList.length]?.url
        if (account.privateKey) {
          this.queue.add(async () => {
            try {
              return await this.processKeepAlive(account)
            } catch (error: any) {
              this.logger(`${account.address} 心跳失败，${error.message}`)
              // throw error
            }
          })
        }
      }
      this.dailyQueue.start()
      await this.queue.onIdle()
    }
    executeKeepAlive()
    executeDaily()
  }
}
