import { IpcMainEvent } from 'electron'
import { DePIN } from '.'
import { electronStore } from '../../store'
import { getRandomUserAgent } from '../../config/userAgent'
import { PinAIAccount } from '../../../types/account'
import { sleep } from '../../utils/common'
export default class PinAI extends DePIN {
  private executeMap: Map<string, number> = new Map()
  constructor(event: IpcMainEvent) {
    super(event, 'pinAI', {
      intervalSeconds: 10 * 1000,
      baseURL: 'https://prod-api.pinai.tech'
    })
  }
  async ready() {
    const accounts = electronStore.get('pinAIAccounts')
    for (const account of accounts) {
      if (!account.ua) {
        account.ua = getRandomUserAgent()
      }
    }
    electronStore.set('pinAIAccounts', accounts)
  }
  getHeaders(account: PinAIAccount) {
    return {
      headers: {
        accept: 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        lang: 'en-US',
        'content-type': 'application/json',
        'sec-ch-ua': account.ua,
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        Referer: 'https://web.pinai.tech/',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        Authorization: `Bearer ${account.token}`,
        userAgent: account.ua
      } as any
    }
  }
  async process(account: PinAIAccount) {
    const { email } = account
    this.logger(`开始处理${email}`)
    const headers = await this.getHeaders(account)
    await this.request.get('/home', { headers })
    const { data: taskList = [] } = await this.request.get<{
      data: { id: number }[]
    }>('/task/random_task_list', { headers })
    if (taskList.length > 0) {
      for (const task of taskList) {
        const taskId = task.id
        if (taskId) {
          try {
            await this.request.post<{ data: unknown }>(
              `/task/${taskId}/claim`,
              {},
              { headers }
            )
            this.logger(`✅ [${email}] Task ${taskId}: Claimed`)
            await sleep(1000)
          } catch (error) {
            this.logger(`❌ [${email}] Task ${taskId}: Failed`)
          }
        }
      }
    } else {
      this.logger(`❌ [${email}] 没有任务`)
    }
    for (const type of ['Twitter', 'Google', 'Telegram']) {
      try {
        const body = [{ type, count: 1 }]
        await this.request.post('/home/collect', body, { headers })
        this.logger(`✅ [${email}] ${type} 收集资源`)
        await sleep(2000)
      } catch (error) {
        this.logger(`❌ [${email}] ${type} 收集资源失败`)
      }
    }
    this.executeMap.set(email, Date.now())
  }
  async run() {
    if (this.isRunning) {
      this.logger('PinAI 已经在运行')
      return
    }
    await this.ready()
    this.isRunning = true
    this.logger('PinAI 开始运行')
    setInterval(() => {
      const accounts = electronStore.get('pinAIAccounts')
      for (const account of accounts) {
        const lastExecuteTime = this.executeMap.get(account.email)
        if (lastExecuteTime) {
          const now = Date.now()
          if (now - lastExecuteTime >= this.intervalSeconds) {
            this.queue.add(() => {
              this.process(account)
            })
          }
        }
      }
    }, this.intervalSeconds)
  }
}
