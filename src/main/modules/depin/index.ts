import { IpcMainEvent } from 'electron'
import PQueue from 'p-queue'
import os from 'os'
export class DePIN {
  protected event: IpcMainEvent
  protected queue: PQueue
  protected intervalSeconds: number = 30 * 1000
  protected name: string
  constructor(
    event: IpcMainEvent,
    name: string,
    intervalSeconds: number = 30 * 1000
  ) {
    this.event = event
    this.queue = new PQueue({ concurrency: os.cpus().length })
    this.intervalSeconds = intervalSeconds
    this.name = name
  }
  logger(message: string) {
    this.event.reply(`${this.name}Log`, { type: 'info', message })
  }
}
