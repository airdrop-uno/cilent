import { IpcMainEvent } from 'electron'
import { electronStore } from '../../store'
import PQueue from 'p-queue'
import os from 'os'
import { Request } from '../base/request'
import { VoltixAccount } from '../../../types/account'
import { getProxyAgent } from '../../utils/depin'
const BASE_URL = 'https://api.voltix.ai'
export const request = new Request(BASE_URL)
const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: `Bearer ${token}`
})

export default class Voltix {
  private event: IpcMainEvent
  private intervalSeconds: number = 10 * 1000
  private isRunning: boolean = false
  private queue: PQueue = new PQueue({ concurrency: os.cpus().length / 2 })
  constructor(event: IpcMainEvent) {
    this.event = event
  }
  async execute(account: VoltixAccount) {
    const headers = getHeaders(account.token)
    const httpsAgent = getProxyAgent(account.proxy)
    const fetchData = async <T>(url: string): Promise<T> => {
      const { data } = await request.get<{ data: T }>(url, {
        headers,
        httpsAgent
      })
      return data as T
    }
    const {
      data: { raw_address: rawAddress }
    } = await fetchData<{
      data: {
        raw_address: string
      }
    }>('/users')
    const socialTasks = await fetchData<
      {
        category: string
        id: string
        title: string
      }[]
    >('/tasks/socials')
    const allTasks = socialTasks.filter((t) => t.category === account.category)

    const completedTasks = await fetchData<
      {
        status: string
        task_id: string
      }[]
    >('/user-tasks/social/completed')
    const readyClaimTasks = completedTasks.filter(
      (t) => t.status === 'COMPLETED'
    )
    await Promise.all(
      readyClaimTasks.map(async (t) => {
        const { data } = await fetchData<{ data: number }>(
          `/user-tasks/social/${t.task_id}/claim`
        )
        if (data === 1) {
          this.event.reply('voltixLog', {
            message: `Voltix claim task ${t.task_id} success`,
            type: 'success'
          })
        } else {
          this.event.reply('voltixLog', {
            message: `Voltix claim task ${t.task_id} failed`,
            type: 'error'
          })
        }
      })
    )
    const newCompletedTasks = await fetchData<
      {
        status: string
        task_id: string
      }[]
    >('/user-tasks/social/completed')
    const readyToProcessTasks = allTasks.filter((task) => {
      const completedTask = newCompletedTasks.find((t) => t.task_id === task.id)
      return !(completedTask && completedTask.status === 'CLAIMED')
    })
    if (readyToProcessTasks.length === 0) {
      this.event.reply('voltixLog', {
        message: `No More Tasks for account: ${rawAddress}! All tasks complete.`,
        type: 'success'
      })
    } else {
      await Promise.all(
        readyToProcessTasks.map(async (t) => {
          const {
            data: { status }
          } = await request.post<{
            data: { status: string }
          }>(`/user-tasks/social/verify/${t.id}`)
          if (status === 'IN_PROGRESS') {
            this.event.reply('voltixLog', {
              message: `Processing Task: ${t.title}(${t.id})\n`,
              type: 'success'
            })
            const { data } = await request.post<{ data: number }>(
              `/user-tasks/social/${t.id}/claim`,
              {},
              {
                headers,
                httpsAgent
              }
            )
            if (data === 1) {
            }
          }
        })
      )
    }
    setTimeout(() => {
      this.execute(account)
    }, this.intervalSeconds)
  }
  run() {
    if (this.isRunning) {
      this.event.reply('toastMessage', {
        message: 'Voltix is already running',
        type: 'error'
      })
      return
    }
    this.isRunning = true
    const accounts = electronStore.get('voltixAccounts')
    for (const account of accounts) {
      this.queue.add(async () => {
        await this.execute(account)
      })
    }
  }
}
