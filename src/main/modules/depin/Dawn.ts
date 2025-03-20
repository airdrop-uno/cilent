import { IpcMainEvent } from 'electron'
import { electronStore } from '../../store'
import { DawnAccount } from '../../../types/account'
import { DePIN } from '.'
import getRandomUserAgent from '../../config/userAgent'
import { getProxyAgent } from '../../utils/depin'
import { Request } from '../base/request'

const request = new Request('https://dawn.xyz/api')
export default class Dawn extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'dawn', 30 * 1000)
  }
  async process(account: DawnAccount) {
    const { email, token, proxy, ua } = account
    this.logger(`开始处理${email}`)
    try {
      const httpAgent = getProxyAgent(proxy)
      const response = await request.post<{ data: unknown }>(
        '/user/nodes/ping',
        {
          type: 'extension'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
    } catch (error) {
      this.logger(`${email} 处理失败: ${(error as any).message}`)
    }
  }
  async run() {
    const dawnAccounts = electronStore.get('dawnAccounts')
    for (const account of dawnAccounts) {
      const { email, ua, token } = account
      if (!token) {
        this.logger(`${email} has no token`)
        continue
      }
      if (!ua) {
        account.ua = getRandomUserAgent()
        electronStore.set('dawnAccounts', dawnAccounts)
      }
      await this.process(account)
    }
  }
}
