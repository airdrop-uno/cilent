import { IpcMainEvent } from 'electron'
import { DePIN } from './index'

export default class ByData extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'ByData', { intervalSeconds: 30 * 1000 })
  }
}
