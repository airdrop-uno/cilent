import { IpcMainEvent } from 'electron'
import os from 'os'
import { ProxyMode } from '../../../types/account'
import Flow3 from '../../modules/depin/Flow3'
import { electronStore } from '../../store'
import { createSolanaWallet } from '../../utils/common/account'
let flow3: Flow3
export const Flow3Actions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  batchCreateFlow3Wallet: async (
    event: IpcMainEvent,
    count: number
  ): Promise<void> => {
    const walets = await createSolanaWallet(count)
    const { wallets } = electronStore.get('flow3')
    const currentAccounts = [...walets, ...wallets]
    electronStore.set('flow3.wallets', currentAccounts)
    event.reply('updateFlow3Accounts', currentAccounts)
    event.reply('toastMessage', {
      status: 'success',
      message: `生成 ${count} 个 Flow3 钱包成功`
    })
  },
  startFlow3: async (
    event: IpcMainEvent,
    options: {
      concurrency: number
      proxyMode: ProxyMode
      proxyApiUrl: string
      inviteCode: string
    }
  ): Promise<void> => {
    flow3 ||= new Flow3(event)
    const {
      concurrency = os.cpus().length,
      proxyMode = 'Static',
      proxyApiUrl = '',
      inviteCode = ''
    } = options
    electronStore.set('flow3.concurrency', concurrency)
    electronStore.set('flow3.proxyMode', proxyMode)
    electronStore.set('flow3.proxyApiUrl', proxyApiUrl)
    electronStore.set('flow3.inviteCode', inviteCode)
    flow3.setConcurrency(concurrency)
    flow3.setProxyMode(proxyMode)
    flow3.setProxyDynamicUrl(proxyApiUrl)
    await flow3.run()
  },
  stopFlow3: async (event: IpcMainEvent): Promise<void> => {
    if (!flow3 || !flow3.isRunning) {
      event.reply('toastMessage', {
        status: 'error',
        message: 'Flow3 未启动'
      })
      return
    }
    flow3.stop()
  }
}
