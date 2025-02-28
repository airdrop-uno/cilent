import { IpcMainEvent } from 'electron'
import { createAccount, getBalance } from '../utils/common/account'
import { electronStore } from '../store'

export const EtherActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  getChainBalance: async (
    event: IpcMainEvent,
    { provider, address }
  ): Promise<void> => {
    try {
      const balance = await getBalance(provider, address)
      event.reply('getChainBalance', { balance, status: true })
    } catch (error) {
      event.reply('getChainBalance', {
        balance: 0,
        status: false,
        message: (error as any).message
      })
    }
  },
  createAccount: async (event: IpcMainEvent, amount: number): Promise<void> => {
    const accounts = createAccount(amount)
    const currentAccounts = [...accounts, ...electronStore.get('accounts')]
    electronStore.set('accounts', currentAccounts)
    event.reply('createAccount', currentAccounts)
  }
}
