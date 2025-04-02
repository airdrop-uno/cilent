import { IpcMainEvent } from 'electron'
import { Flow3Actions } from './flow3'
import { MonadScoreActions } from './monadScore'
import { StorkActions } from './stork'
import { HumanityActions } from './humanity'
import { HaioActions } from './haio'
import { NodeGoActions } from './nodeGo'
export const DePINActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  ...Flow3Actions,
  ...MonadScoreActions,
  ...StorkActions,
  ...HumanityActions,
  ...HaioActions,
  ...NodeGoActions
}
