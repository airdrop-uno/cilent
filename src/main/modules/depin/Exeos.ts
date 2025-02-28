import { IpcMainEvent } from 'electron'
import { DePIN } from '.'
import { electronStore } from '../../store'
import { getRandomUserAgent } from '../../config/userAgent'
import { ExeosAccount } from '../../../types/account'
import { sleep } from '../../utils/common'
import { getPublicIP } from '../../utils/depin'
export default class Exeos extends DePIN {
  private livenessInterval = 5 * 1000
  private connectInterval = 60 * 1000
  constructor(event: IpcMainEvent) {
    super(event, 'exeos', {
      intervalSeconds: 30 * 1000,
      baseURL: 'https://api.exeos.network',
      defaultHeaders: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json'
      }
    })
  }

  async livenessSequence(account: ExeosAccount) {
    const { headers, httpsAgent } = await this.getHeaders(account)
    await this.request.post(
      '/extension/liveness',
      { extensionId: account.extensionId },
      {
        headers,
        httpsAgent
      }
    )
    await sleep(5000)
  }
  async connectSequence(account: ExeosAccount) {
    const { email, proxy, extensionId } = account
    const ip = getPublicIP(proxy)
    if (!ip) {
      const msg = `${email}获取公网id失败，请检查网络连接或代理：${proxy}`
      this.logger(msg)
      throw new Error(msg)
    }
    const { headers, httpsAgent } = await this.getHeaders(account)
    await this.request.post(
      '/extension/connect',
      {
        ip,
        extensionId
      },
      {
        headers,
        httpsAgent
      }
    )
    await this.request.post(
      '/extension/stats',
      {
        extensionId
      },
      {
        headers,
        httpsAgent
      }
    )
    const { data } = await this.request.get<{
      data: {
        points: number
        referralPoints: number
        earningsTotal: number
        networkNodes: { status: string; totalRewards: number }[]
      }
    }>('/account/web/me', {
      headers,
      httpsAgent
    })
    const newAccount = { ...account }
    newAccount.points = data.points || 0
    newAccount.referralPoints = data.referralPoints || 0
    newAccount.earningsTotal = data.earningsTotal || 0
    newAccount.totalRewards = data.networkNodes.reduce(
      (acc, node) => acc + node.totalRewards,
      0
    )
    const accounts = electronStore.get('exeosAccounts')
    const index = accounts.findIndex((item) => item.email === email)
    if (index !== -1) {
      accounts[index] = newAccount
      electronStore.set('exeosAccounts', accounts)
      this.event.reply('updateExeosAccounts', accounts)
    }
  }

  async process(account: ExeosAccount) {
    await this.connectSequence(account)
    setInterval(() => {
      this.livenessSequence(account)
    }, this.livenessInterval)
    setInterval(() => {
      this.connectSequence(account)
    }, this.connectInterval)
  }

  async ready() {
    const accounts = electronStore.get('exeosAccounts')
    for (const account of accounts) {
      const { ua } = account
      if (!ua) {
        account.ua = getRandomUserAgent()
        electronStore.set('exeosAccounts', accounts)
      }
    }
  }
  async run() {
    this.preRun()
    await this.ready()
    this.timer = setInterval(() => {
      const accounts = electronStore.get('exeosAccounts')
      for (const account of accounts) {
        this.queue.add(() => {
          this.livenessSequence(account)
        })
      }
    }, this.livenessInterval)
    setInterval(() => {
      const accounts = electronStore.get('exeosAccounts')
      for (const account of accounts) {
        this.queue.add(() => {
          this.connectSequence(account)
        })
      }
    }, this.connectInterval)
  }
}
