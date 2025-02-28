import { ipcMain } from 'electron'
import { AppActions } from './app'
import { FaucetActions } from './faucet'
import { EtherActions } from './ethers'
import { DePINActions } from './depin'

export const registerListeners = (): void => {
  const actions = {
    ...AppActions,
    ...FaucetActions,
    ...EtherActions,
    ...DePINActions
  }
  for (const action in actions) {
    ipcMain.on(action, actions[action])
  }
}
