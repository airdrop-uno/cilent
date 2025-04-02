import { IpcMainEvent } from 'electron'

export const NodeGoActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {}
