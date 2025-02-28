import { IpcMainEvent } from 'electron'
import { DePIN } from './index'

export default class Vendetta extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'Vendetta', { intervalSeconds: 30 * 1000 })
  }
}
