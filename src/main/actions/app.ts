import { dialog, IpcMainEvent, OpenDialogOptions, shell } from 'electron'
import axios from 'axios'
import getMAC from 'getmac'
import fs from 'fs'
import { faker } from '@faker-js/faker'

import { electronStore, Store } from '../store'
import { openBrowser } from '../utils/browser'
import { Account } from '../../types/account'
import { SMSActive } from '../utils/SMSActive'
import { registerGmailAccount } from '../modules/email/gmail'
import { getProxyAgent, getPublicIP } from '../utils/depin'
import PQueue from 'p-queue'

export const AppActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  set: async <Key extends keyof Partial<Store>>(
    event: IpcMainEvent,
    key: Key,
    value: Store[Key]
  ) => {
    // const current = electronStore.get(key)
    electronStore.set(key, value)
    event.returnValue = true
  },
  get: async <Key extends keyof Partial<Store>>(
    event: IpcMainEvent,
    key: Key
  ) => {
    event.returnValue = electronStore.get(key)
  },
  ping: async (
    event: IpcMainEvent,
    { host, proxy }: { host: string; proxy?: string }
  ) => {
    const start = Date.now()
    try {
      await axios.get(host, {
        httpsAgent: getProxyAgent(proxy),
        timeout: 3500
      })
      event.reply('ping', {
        status: true,
        time: Date.now() - start
      })
    } catch (error) {
      event.reply('ping', {
        status: false,
        time: Date.now() - start,
        message: (error as Error).message
      })
    }
  },
  openExternal: async (event: IpcMainEvent, url) => {
    event.preventDefault()
    shell.openExternal(url)
  },
  init: async (event: IpcMainEvent) => {
    event.reply('init', { data: electronStore.store, status: true })
  },
  select: async <
    Key extends keyof Pick<Store, 'userDirectory' | 'chromeExecutablePath'>
  >(
    _event: IpcMainEvent,
    { type, key }: { type: 'File' | 'Directory'; key: Key }
  ) => {
    const options: OpenDialogOptions = {
      properties: [`open${type}` as 'openFile' | 'openDirectory']
    }
    const defaultPath = electronStore.get(key)
    if (defaultPath) {
      options.defaultPath = defaultPath
    }
    dialog.showOpenDialog(options).then((result) => {
      const value = result.filePaths[0]
      electronStore.set(key, value)
      _event.reply(`select-${key}`, value)
    })
  },
  check: async (event: IpcMainEvent, keys: string[]) => {
    const data = electronStore.store
    let message = ''
    const status = keys.every((key) => {
      if (!data[key]) {
        message = `${key}未设置`
        return false
      }
      return true
    })
    event.reply(`check-${keys.join('-')}`, { status, message })
  },
  openDirectory: async (_event: IpcMainEvent, { path }) => {
    shell.openPath(path)
  },
  exportAccounts: async (_event: IpcMainEvent) => {
    const accounts = electronStore.get('accounts')
    const { filePath } = await dialog.showSaveDialog({
      title: '导出钱包',
      defaultPath: 'accounts.json'
    })
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(accounts, null, 4))
      _event.reply('exportAccounts', { status: true, filePath })
    }
  },
  updateAccount: async (_event: IpcMainEvent, account: Account) => {
    const accounts = electronStore.get('accounts')
    const index = accounts.findIndex((w) => w.address === account.address)
    accounts[index] = account
    electronStore.set('accounts', accounts)
    _event.reply('updateAccount', { status: true, accounts })
  },
  deleteAccount: async (_event: IpcMainEvent, address: string) => {
    const accounts = electronStore.get('accounts')
    const index = accounts.findIndex((w) => w.address === address)
    accounts.splice(index, 1)
    electronStore.set('accounts', accounts)
    _event.reply('deleteAccount', { status: true, accounts })
  },
  openBrowser: async (_event: IpcMainEvent, address: string) => {
    openBrowser(address)
  },
  checkApiKey: async (_event: IpcMainEvent, key: string): Promise<void> => {
    const apiKey = electronStore.get(key)
    if (!apiKey) {
      _event.reply('checkApiKey', { status: false, error: 'API Key 未设置' })
      return
    }
    switch (key) {
      case 'smsActiveApiKey': {
        const sms = new SMSActive(apiKey as string)
        try {
          await sms.getBalance()
          _event.reply('checkApiKey', { status: true, balance: sms.balance })
        } catch (error) {
          _event.reply('checkApiKey', {
            status: false,
            error: (error as Error).message || '无效的 API Key'
          })
        }
        break
      }
      default:
        break
    }
  },
  registerGmail: async (
    _event: IpcMainEvent,
    options: { count: number; country: string }
  ): Promise<void> => {
    const accounts = Array.from({ length: options.count }, () => {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const data = faker.date.between({
        from: '1985-01-01T00:00:00.000Z',
        to: '2004-01-01T00:00:00.000Z'
      })
      return {
        firstName,
        lastName,
        email: faker.internet.email({
          firstName,
          lastName,
          provider: 'gmail.com'
        }),
        password: faker.internet.password(),
        year: data.getFullYear().toString(),
        month: (data.getMonth() + 1).toString(),
        day: data.getDate().toString(),
        gender: '1'
      }
    })
    const oldAccounts = electronStore.get('gmailAccounts')
    const newAccounts = [...accounts, ...oldAccounts]
    while (accounts.length > 0) {
      try {
        const account = accounts.shift()
        if (!account) break
        await registerGmailAccount(account)
        _event.reply('registerGmail', {
          status: true,
          account,
          hasMore: accounts.length > 0
        })
      } catch (error) {
        _event.reply('registerGmail', {
          status: false,
          error: (error as Error).message
        })
        break
      }
    }
    electronStore.set('gmailAccounts', newAccounts)
  },
  checkProxy: async (_event: IpcMainEvent, urls: string[]) => {
    const queue = new PQueue({ concurrency: 20 })
    const executeMap: Record<string, { status: number; message: string }> =
      Object.create(null)
    for (const url of urls) {
      queue.add(async () => {
        try {
          await getPublicIP(url)
          executeMap[url] = { status: 1, message: '' }
        } catch (error: any) {
          executeMap[url] = { status: -1, message: error.message }
        }
      })
    }
    await queue.onIdle()
    _event.reply('checkProxy', { status: true, data: executeMap })
  },
  getInitData: async (_event: IpcMainEvent) => {
    const macAddress = getMAC()
    try {
      const { data } = await axios.get(
        `https://airdrop.uno/api/client/active?macAddress=${macAddress}`
      )
      _event.reply('getInitData', {
        data: {
          isActive: data
        }
      })
    } catch (error) {
      _event.reply('getInitData', {
        data: {
          isActive: false
        },
        error: (error as Error).message
      })
    }
  },
  activeClient: async (_event: IpcMainEvent, activationCode: string) => {
    const macAddress = getMAC()
    try {
      const { data } = await axios.post(
        'https://airdrop.uno/api/client/active',
        {
          activationCode,
          macAddress
        }
      )
      _event.reply('activeClient', {
        data
      })
    } catch (error) {
      _event.reply('activeClient', {
        error: (error as Error).message
      })
    }
  }
}
export { electronStore }
