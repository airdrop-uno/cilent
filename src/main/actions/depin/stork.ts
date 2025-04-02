import { IpcMainEvent } from 'electron'
import { ExecuteStatus } from '../../../types/depin'
import { Stork } from '../../modules/depin/Stork'

let stork: Stork
export const StorkActions: Record<
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
  }
}
