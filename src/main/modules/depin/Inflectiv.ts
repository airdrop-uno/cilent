import { IpcMainEvent } from 'electron'
import { DePIN } from './index'

export default class Inflectiv extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'Inflectiv', { intervalSeconds: 30 * 1000 })
  }
}
