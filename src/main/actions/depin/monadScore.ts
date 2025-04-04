import { IpcMainEvent } from 'electron'
import lodash from 'lodash'
import { ProxyMode } from '../../../types/account'
import { electronStore } from '../../store'
import { MonadScoreWallet } from '../../../types/account'
import MonadScore from '../../modules/depin/MonadScore'
import { getRandomUserAgent } from '../../config/userAgent'
import { createAccount } from '../../utils/common/account'

let monadScore: MonadScore
export const MonadScoreActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  saveMonadScoreReferralCode: async (
    _event: IpcMainEvent,
    referralCode: string
  ): Promise<void> => {
    electronStore.set('monadScore.referralCode', referralCode)
  },
  batchCreateWallet: async (
    event: IpcMainEvent,
    count: number = 10
  ): Promise<void> => {
    const { wallets } = electronStore.get('monadScore')
    const res = await createAccount(count)
    for (const wallet of res) {
      wallets.push({
        ...lodash.pick(wallet, ['address', 'privateKey', 'mnemonic']),
        points: 0,
        proxy: '',
        referralCode: '',
        userAgent: getRandomUserAgent(),
        registered: false,
        taskCompleted: 0,
        claimedTasks: [],
        lastRun: undefined,
        message: ''
      } as MonadScoreWallet)
    }
    electronStore.set('monadScore.wallets', wallets)
    event.reply('toastMessage', {
      status: 'success',
      message: `生成 ${res.length} 个 MonadScore 钱包成功`
    })
    event.reply('updateMonadScoreAccounts', wallets)
  },
  startMonadScore: async (
    event: IpcMainEvent,
    options: {
      concurrency: number
      referralCode: string
      proxyMode: ProxyMode
      proxyApiUrl: string
    }
  ): Promise<void> => {
    const {
      concurrency = 10,
      referralCode,
      proxyMode = 'Static',
      proxyApiUrl
    } = options
    if (!referralCode) {
      event.reply('toastMessage', {
        status: 'error',
        message: '推荐码不能为空'
      })
      return
    }
    electronStore.set('monadScore.concurrency', concurrency)
    electronStore.set('monadScore.proxyMode', proxyMode)
    electronStore.set('monadScore.referralCode', referralCode)
    monadScore ||= new MonadScore(event)
    monadScore.setConcurrency(concurrency)
    monadScore.setProxyMode(proxyMode)
    monadScore.setProxyDynamicUrl(proxyApiUrl)
    await monadScore.run()
  },
  stopMonadScore: async (event: IpcMainEvent): Promise<void> => {
    if (!monadScore || !monadScore.isRunning) {
      event.reply('toastMessage', {
        status: 'error',
        message: 'MonadScore 未启动'
      })
      return
    }
    monadScore.stop()
  }
}
