import { IpcMainEvent } from 'electron'
import Cron from 'node-cron'
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
  }
]
export default class MonadScore extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'monadScore', {
      intervalSeconds: 30 * 1000,
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
      wallet.nodeRunning &&
      moment().format('YYYY-MM-DD') ===
        moment(wallet.nodeRunning).format('YYYY-MM-DD') &&
      moment(wallet.nodeRunning).hour() > 8
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
      this.logger(`${wallet.address} node already started today`)
      return
    }
    const { headers, httpsAgent } = await this.getHeaders(wallet)
    this.logger(`start Node ${wallet.address}`)
    if (!wallet.token) {
      await this.refreshToken(wallet)
    }
    try {
      const start = await this.request.put<{
        success: boolean
        user: {
          totalPoints: number
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
      if (start.success) {
        wallet.nodeRunning = new Date()
        wallet.message = '节点启动成功'
        wallet.points = start.user.totalPoints
        this.updateWallet(wallet)
        return this.logger(`Start Node ${wallet.address} success`)
      }
      wallet.message = '节点启动失败'
      this.updateWallet(wallet)
      throw new Error(`Start Node ${wallet.address} failed`)
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        await this.refreshToken(wallet)
        await this.startNode(wallet)
      }
      wallet.message = error.message
    }
  }
  async getLoginToken(wallet: MonadScoreWallet) {
    const { referralCode } = electronStore.get('monadScore')
    const { headers, httpsAgent } = await this.getHeaders(wallet)
    const { success, token } = await this.request.post<{
      success: boolean
      token: string
    }>(
      '/user',
      { wallet: wallet.address, invite: referralCode },
      {
        headers,
        httpsAgent
      }
    )
    if (success) {
      wallet.loginToken = token
      this.updateWallet(wallet)
      this.logger(`getLoginToken ${wallet.address} success`)
      return token
    }
    this.logger(`getLoginToken ${wallet.address} failed`)
    throw new Error(`getLoginToken ${wallet.address} failed`)
  }
  async refreshToken(wallet: MonadScoreWallet) {
    const { headers, httpsAgent } = await this.getHeaders(wallet)
    if (!wallet.loginToken) {
      await this.getLoginToken(wallet)
    }
    this.logger(`refreshToken ${wallet.address}`)
    try {
      const { success, token, user } = await this.request.post<{
        success: boolean
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
        }
      )
      if (success) {
        wallet.token = token
        wallet.referralCode = user.referralCode
        wallet.points = user.totalPoints
        wallet.claimedTasks = user.claimedTasks
        this.updateWallet(wallet)
        this.logger(`refreshToken ${wallet.address} success`)
        return
      }
      throw new Error(`refreshToken ${wallet.address} failed`)
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        await this.getLoginToken(wallet)
        return await this.refreshToken(wallet)
      }
      throw error
    }
  }

  async process(wallet: MonadScoreWallet) {
    if (!wallet.registered) {
      await this.getLoginToken(wallet)
      await this.refreshToken(wallet)
    }
    if (
      wallet.registered &&
      (wallet.claimedTasks?.length === tasks.length ||
        wallet.taskCompleted === 3)
    ) {
      this.logger(`${wallet.address} has completed all tasks`)
      return this.startNode(wallet)
    }
    const tasksAvailable = tasks.filter(
      (t) => !wallet.claimedTasks?.includes(t.id)
    )
    if (tasksAvailable.length === 0 || wallet.taskCompleted === 3) {
      this.logger(`No tasks available for ${wallet.address}`)
      return this.startNode(wallet)
    }
    const { headers, httpsAgent } = await this.getHeaders(wallet)
    for (const task of tasksAvailable) {
      this.logger(`Trying complete task: ${task.id} | ${task.title}...`)
      const res = await this.request.post(
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
      if (res.success) {
        this.logger(`Complete task ${task.id} | ${task.title} success`)
      } else {
        this.logger(
          `Can't complete task ${task.id} | ${task.title} | ${JSON.stringify(res)}...`
        )
      }
    }
    await this.startNode(wallet)
  }

  async run() {
    this.preRun()
    const execute = () => {
      const { referralCode, wallets } = electronStore.get('monadScore')
      if (!referralCode) return this.logger('Empty ReferralCode')
      if (wallets.length === 0) return this.logger('Empty Wallets')
      const list = electronStore
        .get('staticProxy')
        .filter((i) => i.status === 1)
      for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i]
        if (this.validRunning(wallet)) {
          this.logger(`${wallet.address} node already started today`)
          continue
        }
        if (!wallet.proxy && this.proxyMode === 'Static') {
          wallet.proxy = list[i % list.length].url
        }
        this.queue.add(async () => {
          try {
            await this.process(wallet)
          } catch (error: any) {
            this.logger(`Error: ${error.message}`)
            console.error(error)
            wallet.message = error.message
            this.updateWallet(wallet)
          }
        })
      }
    }

    execute()
    this.cronTask = Cron.schedule('0 1 8 * *', async () => {
      this.logger('Start MonadScore at 8:01')
      await sleep(Math.random() * 10)
      execute()
    })
  }
}
