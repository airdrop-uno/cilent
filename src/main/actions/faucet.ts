import { IpcMainEvent } from 'electron'
import { join } from 'path'
import { createWallet } from '../utils/wallet'
import { mintFaucet } from '../utils/monad'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import moment from 'moment'
import { getConfig } from '../utils/config'

export enum FaucetAction {
  MintMonadTestToken = 'mintMonadTestToken'
}
export const AppActions: Record<
  FaucetAction,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  [FaucetAction.MintMonadTestToken]: async (
    event: IpcMainEvent,
    { amount }: { amount: number }
  ) => {
    // 创建文件夹
    const { userDirectory, chromeExecutablePath, recaptchaToken } = getConfig()
    const now = moment().format('YYYY-MM-DD HH:mm:ss')
    const folder = join(userDirectory, `monad-${now}`)
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true })
    }
    const snapshotFolder = join(folder, `snapshot-${now}`)
    if (!existsSync(snapshotFolder)) {
      mkdirSync(snapshotFolder, { recursive: true })
    }
    // 创建钱包
    const wallets = createWallet(amount)
    // 领取代币
    for (const wallet of wallets) {
      event.reply('mint-monad-faucet-progress', {
        wallet,
        progress: 0
      })
      await mintFaucet(wallet, recaptchaToken, chromeExecutablePath, snapshotFolder)
      event.reply('mint-monad-faucet-progress', {
        wallet,
        progress: 100
      })
    }
    // 创建钱包文件
    const walletsFile = join(folder, 'wallets.json')
    writeFileSync(walletsFile, JSON.stringify(wallets, null, 2))

    // 返回结果
    event.reply('mint-monad-faucet-result', {
      wallets,
      folder,
      snapshotFolder
    })
  }
}
