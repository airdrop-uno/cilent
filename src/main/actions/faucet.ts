import { IpcMainEvent } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import dappeteer from '@chainsafe/dappeteer'
import moment from 'moment'
import { createAccount } from '../utils/common/account'
import { mintFaucet } from '../utils/faucet/monad'
import { MetaMask } from '../constants'
import { electronStore } from '../store'

export const FaucetActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  mintMonadTestToken: async (
    event: IpcMainEvent,
    { amount, headless }: { amount: number; headless: boolean }
  ) => {
    // 创建文件夹
    const userDirectory = electronStore.get('userDirectory') as string
    const now = moment().format('YYYYMMDDHHmmss')
    const folder = join(userDirectory, `monad${now}`)
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true })
    }
    const snapshotFolder = join(folder, `snapshot-${now}`)
    if (!existsSync(snapshotFolder)) {
      mkdirSync(snapshotFolder, { recursive: true })
    }
    // 创建钱包
    const accounts = await createAccount(amount)
    // 领取代币
    for (const account of accounts) {
      await mintFaucet(account, snapshotFolder, event, { headless })
    }
    // 创建钱包文件
    const accountsFile = join(folder, 'accounts.json')
    writeFileSync(accountsFile, JSON.stringify(accounts, null, 2))

    // 返回结果
    event.reply('batchFaucetMonadFinished', {
      accounts,
      folder,
      snapshotFolder
    })
  },
  mintMonadFreeNFT: async (
    _event: IpcMainEvent,
    { headless, seed }: { headless: boolean; seed: string }
  ) => {
    const { browser } = await dappeteer.bootstrap({
      seed,
      headless,
      password: MetaMask.password,
      puppeteerOptions: {
        args: ['--no-sandbox', '--disabled-setupid-sandbox']
      }
    })
    const dappPage = await browser.newPage()
    await dappPage.goto(
      'https://magiceden.io/mint-terminal/monad-testnet/0x002c8fd766605b609d31cc9764e27289daf033e9'
    )
  }
}
