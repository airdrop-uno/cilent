import { IpcMainEvent } from 'electron'
import { Email as EmailAccount } from '../../../types/account'
import PQueue from 'p-queue'
import os from 'os'
export default class Email {
  private event: IpcMainEvent
  constructor(event: IpcMainEvent) {
    this.event = event
  }
  async register(
    domain: string,
    password?: string,
    prefix?: string
  ): Promise<EmailAccount> {
    return {
      email: `${prefix}${Math.random().toString(36).substring(2, 15)}@${domain}`,
      password: password || Math.random().toString(36).substring(2, 15)
    }
  }
  async batchRegister(
    amount: number,
    domain: string,
    password?: string,
    prefix?: string
  ): Promise<EmailAccount[]> {
    const queue = new PQueue({ concurrency: os.cpus().length })
    const list: EmailAccount[] = []
    for (let i = 0; i < amount; i++) {
      queue.add(async () => {
        const res = await this.register(domain, password, prefix)
        list.push(res)
      })
    }
    await queue.onIdle()
    return list
  }
  async readEmailContent(email: string, password: string): Promise<string> {
    return ''
  }
  async sendEmail(from: string, to: string, subject: string, content: string) {
    return ''
  }
}
