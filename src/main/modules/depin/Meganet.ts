import { IpcMainEvent } from 'electron'
import { DePIN } from './index'

export default class Meganet extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'Meganet', { intervalSeconds: 30 * 1000 })
  }
}
