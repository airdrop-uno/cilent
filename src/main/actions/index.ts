import { ipcMain, IpcMainEvent, shell } from 'electron'
import { getConfig, updateConfig } from '../utils/config'
export enum AppAction {
  LoadData = 'loadData',
  OpenUrl = 'openUrl',
  SaveAddress = 'saveAddress'
}
export enum AppActionReply {
  LoadData = 'loadDataReply',
  OpenUrl = 'openUrlReply',
  SaveAddress = 'saveAddressReply'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AppActions: Record<AppAction, (event: IpcMainEvent, ...args: any[]) => Promise<void>> =
  {
    [AppAction.LoadData]: async (event: IpcMainEvent) => {
      const data = getConfig()
      event.reply(AppActionReply.LoadData, { data, status: true })
    },
    [AppAction.OpenUrl]: async (event: IpcMainEvent, { url }) => {
      event.preventDefault()
      shell.openExternal(url)
    },
    [AppAction.SaveAddress]: async (event: IpcMainEvent, { address }) => {
      updateConfig({ address })
      event.reply(AppActionReply.SaveAddress, { address, status: true })
    }
  }

export const registerListeners = (): void => {
  for (const action in AppActions) {
    ipcMain.on(action, AppActions[action])
  }
}
