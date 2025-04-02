import { IpcMainEvent } from 'electron'
import Humanity from '../../modules/depin/Humanity'

let humanity: Humanity

export const HumanityActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
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
    humanity.stop()
  }
}
