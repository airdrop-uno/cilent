import { IpcMainEvent } from 'electron'
import { DePIN } from './index'

export default class OptimAi extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'OptimAi', { intervalSeconds: 30 * 1000 })
  }
}
