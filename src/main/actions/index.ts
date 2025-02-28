import { dialog, ipcMain, IpcMainEvent, OpenDialogOptions, shell } from 'electron'
import ping from 'ping'
import { getConfig, updateConfig } from '../utils/config'
export enum AppAction {
  OpenUrl = 'openUrl',
  InitApp = 'initApp',
  Select = 'select',
  CheckConfig = 'checkConfig',
  Ping = 'ping',
  OpenDirectory = 'openDirectory',
  UpdateConfig = 'updateConfig'
}
export enum AppActionReply {
  OpenUrl = 'openUrlReply',
  SaveAddress = 'saveAddressReply',
  InitApp = 'initAppReply',
  Ping = 'pingReply'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AppActions: Record<AppAction, (event: IpcMainEvent, ...args: any[]) => Promise<void>> =
  {
    [AppAction.Ping]: async (event: IpcMainEvent, host: string) => {
      const { inputHost } = await ping.promise.probe(host)
      event.reply(AppActionReply.Ping, inputHost && inputHost !== 'unknown')
    },
    [AppAction.OpenUrl]: async (event: IpcMainEvent, { url }) => {
      event.preventDefault()
      shell.openExternal(url)
    },
    [AppAction.InitApp]: async (event: IpcMainEvent) => {
      const data = getConfig()
      event.reply(AppActionReply.InitApp, { data, status: true })
    },
    [AppAction.Select]: async (
      _event: IpcMainEvent,
      { type, key }: { type: 'File' | 'Directory'; key: 'userDirectory' | 'chromeExecutablePath' }
    ) => {
      const options: OpenDialogOptions = {
        properties: [`open${type}` as 'openFile' | 'openDirectory']
      }
      const config = getConfig()
      if (config[key]) {
        options.defaultPath = config[key]
      }
      dialog.showOpenDialog(options).then((result) => {
        const value = result.filePaths[0]
        updateConfig({ [key]: value })
        _event.reply(`select-${key}`, value)
      })
    },
    [AppAction.CheckConfig]: async (event: IpcMainEvent, keys: string[]) => {
      const data = getConfig()
      let message = ''
      const status = keys.every((key) => {
        if (!data[key]) {
          message = `${key}未设置`
          return false
        }
        return true
      })
      event.reply(`checkConfig-${keys.join('-')}`, { status, message })
    },
    [AppAction.OpenDirectory]: async (_event: IpcMainEvent, { path }) => {
      shell.openPath(path)
    },
    [AppAction.UpdateConfig]: async (_event: IpcMainEvent, { key, value }) => {
      updateConfig({ [key]: value })
    }
  }

export const registerListeners = (): void => {
  for (const action in AppActions) {
    ipcMain.on(action, AppActions[action])
  }
}
