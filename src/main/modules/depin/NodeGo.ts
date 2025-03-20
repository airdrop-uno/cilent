import { IpcMainEvent } from 'electron'
import { electronStore } from '../../store'
import { NodeGoAccount } from '../../../types/account'
import { getProxyAgent } from '../../utils/depin'
import { Request } from '../base/request'
import getRandomUserAgent from '../../config/userAgent'
import { DePIN } from '.'

const request = new Request('https://nodego.ai/api')
export default class NodeGo extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'nodeGo', 30 * 1000)
  }
  async process(account: NodeGoAccount) {
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
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: '*/*',
            Origin: 'chrome-extension://jbmdcnidiaknboflpljihfnbonjgegah',
            'User-Agent': ua
          },
          httpAgent
        }
      )
      this.logger(`${email} 处理完成: ${JSON.stringify(response.data)}`)
    } catch (error) {
      this.logger(`${email} 处理失败: ${(error as any).message}`)
      console.error(error)
    }
  }
  run() {
    setInterval(() => {
      const nodeGoAccounts = electronStore.get('nodeGoAccounts')
      for (const account of nodeGoAccounts) {
        const { email, ua, token } = account
        if (!token) {
          this.logger(`${email} has no token`)
          continue
        }
        if (!ua) {
          account.ua = getRandomUserAgent()
          electronStore.set('nodeGoAccounts', nodeGoAccounts)
        }
        this.queue.add(async () => {
          this.process(account)
        })
      }
    }, this.intervalSeconds)
  }
}
