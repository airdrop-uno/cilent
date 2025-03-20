import { IpcMainEvent } from 'electron'
import { Stork } from '../modules/depin/Stork'
import { ExecuteStatus } from '../../types/depin'
import Humanity from '../modules/depin/Humanity'
import NodeGo from '../modules/depin/NodeGo'
let stork: Stork
let humanity: Humanity
let nodeGo: NodeGo
export const DePINActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  startStork: async (event: IpcMainEvent): Promise<void> => {
    if (!stork) {
      stork = new Stork(event)
    }
    if (stork.status !== ExecuteStatus.RUNNING) {
      await stork.run()
      event.reply('toastMessage', {
        status: 'success',
        message: 'Stork 开始验证'
      })
    }
  },
  stopStork: async (event: IpcMainEvent): Promise<void> => {
    if (stork) {
      stork.setStatus(ExecuteStatus.STOPPED)
      event.reply('stopStork', { status: true })
    }
  },
  queryHumanity: async (event: IpcMainEvent, list: string[]): Promise<void> => {
    const res = await Promise.all(list.map(Humanity.queryIntegral))
    event.reply('queryHumanity', res)
  },
  startHumanity: async (event: IpcMainEvent): Promise<void> => {
    if (!humanity) {
      humanity = new Humanity(event)
    }
    await humanity.run()
  },
  stopHumanity: async (_event: IpcMainEvent): Promise<void> => {
    if (humanity) {
      humanity.stop()
    }
  },
  startNodeGo: async (event: IpcMainEvent): Promise<void> => {
    if (!nodeGo) {
      nodeGo = new NodeGo(event)
    }
    nodeGo.run()
    event.reply('toastMessage', {
      status: 'success',
      message: 'NodeGo 开始执行'
    })
  }
}
