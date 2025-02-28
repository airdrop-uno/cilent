import { IpcMainEvent } from 'electron'
import { DePIN } from './index'

export default class FishingFrenzy extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'FishingFrenzy', { intervalSeconds: 30 * 1000 })
  }
}