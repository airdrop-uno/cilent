import { IpcMainEvent } from 'electron'
import { DePIN } from './index'
import { electronStore } from '../../store'
import { MonadScoreWallet } from '../../../types/account'
import moment from 'moment'
import { sleep } from '../../utils/common'
const tasks = [
  {
    title: 'Follow MonadScore on X',
    id: 'task001'
  },
  {
    title: 'Like this post',
    id: 'task002'
  },
  {
    title: 'Retweet this post',
    id: 'task003'
  },
  {
    title: 'Collect Bonus points',
    id: 'task101'
  }
]
export default class MonadScore extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'monadScore', {
      baseURL: 'https://mscore.onrender.com',
      defaultHeaders: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        origin: 'https://monadscore.xyz',
        referer: 'https://monadscore.xyz/'
      },
      concurrency: electronStore.get('monadScore.concurrency')
    })
  }
  validRunning(wallet: MonadScoreWallet) {
    return (
      wallet.lastRun &&
      moment(this.now).format('YYYY-MM-DD') ===
        moment(wallet.lastRun).format('YYYY-MM-DD') &&
      moment(wallet.lastRun).hour() > 0
    )
  }
  updateWallet(wallet: MonadScoreWallet) {
    const { wallets } = electronStore.get('monadScore')
    const index = wallets.findIndex((w) => w.address === wallet.address)
    if (index !== -1) {
      wallets[index] = wallet
    }
    electronStore.set('monadScore.wallets', wallets)
    this.event.reply('updateMonadScoreAccounts', wallets)
  }
  async startNode(wallet: MonadScoreWallet) {
    // 判断节点启动时间是否是今天，并且是早上八点之后，如果是，则不启动节点
    if (this.validRunning(wallet)) {
      this.logger(`${wallet.address} 节点已启动`)
      return
    }
    if (!wallet.token) {
      await this.refreshToken(wallet)
    }
    this.logger(`${wallet.address} 节点启动中...`)
    await this.requestWithRetry(
      async () => {
        const { headers, httpsAgent } = await this.getHeaders(wallet)
        wallet.message = '节点启动中...'
        const start = await this.request.put<{
          success: boolean
          user: {
            totalPoints: number
            claimedTasks: string[]
          }
        }>(
          '/user/update-start-time',
          {
            wallet: wallet.address,
            startTime: Date.now()
          },
          {
            headers,
            httpsAgent
          }
        )
        wallet.lastRun = this.now
        wallet.message = '节点启动成功'
        wallet.points = start.user.totalPoints
        wallet.claimedTasks = start.user.claimedTasks
        wallet.registered = true
        const tasksAvailable = tasks.filter(
          (t) => !wallet.claimedTasks?.includes(t.id)
        )
        if (tasksAvailable.length > 0) {
          this.logger(
            `${wallet.address} 检测到有任务${tasksAvailable.map((i) => i.id).join('、')}可完成，开始完成任务...`
          )
          for (const task of tasksAvailable) {
            this.logger(
              `${wallet.address} 尝试完成任务: ${task.id} | ${task.title}...`
            )
            await this.requestWithRetry(
              async () => {
                await this.request.post(
                  '/user/claim-task',
                  {
                    wallet: wallet.address,
                    taskId: task.id
                  },
                  {
                    headers,
                    httpsAgent
                  }
                )
                wallet.claimedTasks?.push(task.id)
                this.logger(
                  `${wallet.address} 任务 ${task.id} | ${task.title} 成功`
                )
              },
              async () => {
                await this.refreshToken(wallet)
              }
            )
            await sleep(Math.random() * 3)
          }
          await this.refreshToken(wallet)
        }
        this.updateWallet(wallet)
        return this.logger(`${wallet.address} 节点启动成功`)
      },
      async () => {
        await this.refreshToken(wallet)
      }
    )
  }
  async getLoginToken(wallet: MonadScoreWallet) {
    const { referralCode } = electronStore.get('monadScore')
    const { headers, httpsAgent } = await this.getHeaders(wallet)
    this.logger(`${wallet.address} 刷新登录Token...`)
    const { token } = await this.request.post<{
      token: string
    }>(
      '/user',
      { wallet: wallet.address, invite: referralCode },
      {
        headers,
        httpsAgent
      },
      1
    )
    wallet.loginToken = token
    wallet.message = '获取登录Token成功'
    this.updateWallet(wallet)
    this.logger(`${wallet.address} 获取登录Token成功`)
  }
  async refreshToken(wallet: MonadScoreWallet) {
    const { headers, httpsAgent } = await this.getHeaders(wallet)
    if (!wallet.loginToken) {
      await this.getLoginToken(wallet)
    }
    this.logger(`${wallet.address} 刷新Token...`)
    await this.requestWithRetry(
      async () => {
        const { token, user } = await this.request.post<{
          token: string
          user: {
            claimedTasks: string[]
            totalPoints: number
            referralCode: string
          }
        }>(
          '/user/login',
          {
            wallet: wallet.address
          },
          {
            headers: {
              ...headers,
              Authorization: `Bearer ${wallet.loginToken}`
            },
            httpsAgent
          },
          1
        )
        wallet.token = token
        wallet.referralCode = user.referralCode
        wallet.points = user.totalPoints
        wallet.claimedTasks = user.claimedTasks
        wallet.registered = true
        wallet.message = '刷新Token成功'
        this.updateWallet(wallet)
        this.logger(`${wallet.address} 刷新Token成功`)
      },
      async () => {
        this.getLoginToken(wallet)
      }
    )
  }
  async run() {
    this.preRun()
    const { referralCode, wallets } = electronStore.get('monadScore')
    if (!referralCode) return this.logger('Empty ReferralCode')
    if (wallets.length === 0) return this.logger('Empty Wallets')
    const list = electronStore
      .get('staticProxy')
      .filter(Boolean)
      .filter((i) => i.status === 1)
    let i = 0
    for (const wallet of wallets) {
      if (!this.isRunning) {
        return this.logger('队列任务已停止')
      }
      this.queue.add(async () => {
        if (this.validRunning(wallet)) {
          this.logger(`${wallet.address} 节点已启动！跳过...`)
          return
        }
        if (!wallet.proxy && this.proxyMode === 'Static' && list.length > 0) {
          wallet.proxy = list[wallets.indexOf(wallet) % list.length].url
        }
        try {
          this.logger(`开始执行第${++i}个节点...`)
          await this.startNode(wallet)
        } catch (error: any) {
          this.logger(`Error: ${error.message}`)
          wallet.message = error.message
          this.updateWallet(wallet)
        }
      })
    }
    this.queue.start()
    await this.queue.onIdle()
  }
}
