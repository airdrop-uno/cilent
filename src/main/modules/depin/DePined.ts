import { IpcMainEvent } from 'electron'
import { DePIN } from '.'
import { getProxyAgent } from '../../utils/depin'
import { DePinedAccount } from '../../../types/account'
import { electronStore } from '../../store'
import { getRandomUserAgent } from '../../config/userAgent'

const headers = {
  accept: 'application/json',
  Origin: 'chrome-extension://pjlappmodaidbdjhmhifbnnmmkkicjoc',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
}
export default class DePined extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'dePined', {
      intervalSeconds: 30 * 1000,
      baseURL: 'https://api.depined.org'
    })
  }
  ready() {
    const accounts = electronStore.get('dePinedAccounts')
    for (const account of accounts) {
      account.ua ||= getRandomUserAgent()
    }
    electronStore.set('dePinedAccounts', accounts)
  }
  updateAccount(account: DePinedAccount) {
    electronStore.set('dePinedAccounts', [
      ...electronStore.get('dePinedAccounts'),
      account
    ])
  }
  getHeaders(account: DePinedAccount) {
    const { token, ua, proxy } = account
    return {
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
        'User-Agent': ua
      },
      httpsAgent: getProxyAgent(proxy)
    }
  }

  async checkReward(account: DePinedAccount) {
    const { headers, httpsAgent } = await this.getHeaders(account)
    const {
      data: { total_unclaimed_points: unClaimedPoints }
    } = await this.request.get<{
      data: { total_unclaimed_points: number }
    }>('/api/referrals/stats', {
      headers,
      httpsAgent
    })
    if (unClaimedPoints > 0) {
      this.logger(`${account.email} 尝试领取 ${unClaimedPoints} 积分`)
      await this.request.post(
        '/api/referrals/claim_points',
        {},
        { headers, httpsAgent }
      )
      this.logger(`${account.email} 领取 ${unClaimedPoints} 个积分成功`)
      this.logger(`${account.email} 当前积分: ${1213}`)
      //   TODO:获取积分
      account.points = 1231
      this.updateAccount(account)
    }
  }

  async process(account: DePinedAccount) {
    this.logger(`${account.email} 连接节点...`)
    const { headers, httpsAgent } = await this.getHeaders(account)
    const data = await this.request.post(
      '/api/user/widget-connect',
      { connected: true },
      {
        headers,
        httpsAgent
      }
    )
    this.logger(`${account.email} 连接节点成功: ${JSON.stringify(data)}`)
    const res = await this.request.get('/api/stats/epoch-earnings', {
      headers,
      httpsAgent
    })
    this.logger(`${account.email} 获取收益: ${JSON.stringify(res)}`)
  }

  async run() {
    if (this.isRunning) {
      this.logger('程序正在运行中...')
      return
    }
    this.isRunning = true
    const accounts = electronStore.get('dePinedAccounts')
    for (const account of accounts) {
      await this.process(account)
    }
  }
}
