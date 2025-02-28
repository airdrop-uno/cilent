import { IpcMainEvent } from 'electron'
import { DePIN } from '.'
import { electronStore } from '../../store'
import { OpenLoopAccount } from '../../../types/account'
import { getProxyAgent } from '../../utils/depin'
import { getRandomUserAgent } from '../../config/userAgent'

const headers = {
  authority: 'api.openloop.so',
  accept: 'application/json',
  'accept-encoding': 'identity', // 不使用任何压缩
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'content-type': 'application/json',
  origin: 'https://openloop.so',
  referer: 'https://openloop.so/',
  'sec-ch-ua':
    '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site'
}
export default class OpenLoop extends DePIN {
  private lock: Map<string, boolean> = new Map()
  constructor(event: IpcMainEvent) {
    super(event, 'openLoop', {
      intervalSeconds: 30 * 1000,
      baseURL: 'https://api.openloop.so'
    })
  }

  async ready() {
    const accounts = electronStore.get('openLoopAccounts')
    for (const account of accounts) {
      if (!account.ua) {
        account.ua = getRandomUserAgent()
      }
    }
    electronStore.set('openLoopAccounts', accounts)
  }
  updateAccount(account: OpenLoopAccount) {
    electronStore.set(
      'openLoopAccounts',
      electronStore
        .get('openLoopAccounts')
        .map((item) => (item.email === account.email ? account : item))
    )
  }
  async getToken({
    proxy,
    email,
    password,
    ua
  }: OpenLoopAccount): Promise<string> {
    const httpsAgent = getProxyAgent(proxy)
    const { code, message } = await this.request.post<{
      code: number
      message?: string
    }>(
      '/users/login',
      {
        username: email,
        password
      },
      {
        headers: {
          ...headers,
          'User-Agent': ua
        },
        httpsAgent
      }
    )
    return ''
  }
  async preProcess(account: OpenLoopAccount) {
    this.logger(`${account.email} 获取新token，尝试登录...`)
    const accessToken = await this.getToken(account)
    //   更新账号和过期时间
    account.token = accessToken
    account.expireTime = Date.now() + 23 * 60 * 60 * 1000
    this.updateAccount(account)
  }
  async shareBandWidth(account: OpenLoopAccount) {
    const { proxy, email, password, token, expireTime, ua } = account
    const httpsAgent = getProxyAgent(proxy)
    const deviceInfo = {
      cpuCores: Math.floor(Math.random() * 4) + 4,
      memoryGB: Math.floor(Math.random() * 8) + 8,
      networkSpeed: Math.floor(Math.random() * 50) + 50,
      deviceId: `WIN-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
      osVersion: 'Windows 10 专业版',
      clientVersion: '1.0.0'
    }
  }
  async process(account: OpenLoopAccount) {
    const { proxy, email, password, token, expireTime, ua } = account
    if (!token || expireTime < Date.now()) {
      await this.preProcess(account)
    } else {
      this.logger(`${email} 使用缓存token`)
      const httpsAgent = getProxyAgent(proxy)
      const {
        data: { missions }
      } = await this.request.get<{
        data: { missions: { missionId: number; status: string }[] }
      }>('/missions', {
        headers: {
          ...headers,
          Authorization: `Bearer ${account.token}`,
          'Content-Type': 'application/json',
          'User-Agent': ua
        },
        httpsAgent
      })
      if (Array.isArray(missions) && missions.length > 0) {
        const availableMissions = missions.filter(
          (m) => m.status === 'available'
        )
        if (availableMissions.length > 0) {
          this.logger(`${email} 📋 发现 ${availableMissions.length} 个可用任务`)
          for (const { missionId } of availableMissions) {
            this.logger(`${email} 🎯 执行任务: ${missionId}`)
            await this.request.get(`/missions/${missionId}/complete`, {
              headers: {
                ...headers,
                Authorization: `Bearer ${account.token}`,
                'Content-Type': 'application/json',
                'User-Agent': ua
              },
              httpsAgent
            })
          }
        }
      }
    }
    await this.shareBandWidth(account)
  }
  async run() {
    await this.ready()
    const accounts = electronStore.get('openLoopAccounts')
    for (const account of accounts) {
      await this.process(account)
    }
  }
}
