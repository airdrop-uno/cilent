import { IpcMainEvent } from 'electron'
import lodash from 'lodash'
import { Stork } from '../modules/depin/Stork'
import { ExecuteStatus } from '../../types/depin'
import Humanity from '../modules/depin/Humanity'
import NodeGo from '../modules/depin/NodeGo'
import { electronStore } from '../store'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import { getRandomUserAgent } from '../config/userAgent'
import Haio from '../modules/depin/Haio'
import { createAccount } from '../utils/common/account'
import MonadScore from '../modules/depin/MonadScore'
import { MonadScoreWallet, ProxyMode } from '../../types/account'
import Flow3 from '../modules/depin/Flow3'

let stork: Stork
let humanity: Humanity
let nodeGo: NodeGo
let haio: Haio
let monadScore: MonadScore
let flow3: Flow3

export const DePINActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
  startStork: async (event: IpcMainEvent): Promise<void> => {
    if (!stork) {
      stork = new Stork(event)
    }
    if (stork.status !== ExecuteStatus.RUNNING) {
      await stork.run()
      event.reply('toastMessage', {
        status: 'success',
        message: 'Stork 开始验证'
      })
    }
  },
  stopStork: async (event: IpcMainEvent): Promise<void> => {
    if (stork) {
      stork.setStatus(ExecuteStatus.STOPPED)
      event.reply('stopStork', { status: true })
    }
  },
  queryHumanity: async (event: IpcMainEvent, list: string[]): Promise<void> => {
    const res = await Promise.all(list.map(Humanity.queryIntegral))
    event.reply('queryHumanity', res)
  },
  startHumanity: async (event: IpcMainEvent): Promise<void> => {
    if (!humanity) {
      humanity = new Humanity(event)
    }
    await humanity.run()
  },
  stopHumanity: async (_event: IpcMainEvent): Promise<void> => {
    if (humanity) {
      humanity.stop()
    }
  },
  startNodeGo: async (event: IpcMainEvent): Promise<void> => {
    if (!nodeGo) {
      nodeGo = new NodeGo(event)
    }
    nodeGo.run()
    event.reply('toastMessage', {
      status: 'success',
      message: 'NodeGo 开始执行'
    })
  },
  setHaioReferralCode: async (
    event: IpcMainEvent,
    referralCode: string
  ): Promise<void> => {
    electronStore.set('haio.referralCode', referralCode)
    event.reply('toastMessage', {
      status: 'success',
      message: 'Haio 推荐码设置成功'
    })
  },
  generateHaioAccount: async (
    event: IpcMainEvent,
    count: number
  ): Promise<void> => {
    const { accounts } = electronStore.get('haio')
    for (let i = 0; i < count; i++) {
      const keypair = Keypair.generate()
      accounts.push({
        address: keypair.publicKey.toBase58(),
        privateKey: bs58.encode(keypair.secretKey),
        token: '',
        userAgent: getRandomUserAgent()
      })
    }
    electronStore.set('haio.accounts', accounts)
    event.reply('toastMessage', {
      status: 'success',
      message: `生成 ${count} 个 Haio 账户成功`
    })
  },
  startHaio: async (event: IpcMainEvent): Promise<void> => {
    if (!haio) {
      haio = new Haio(event)
    }
    await haio.run()
  },
  stopHaio: async (event: IpcMainEvent): Promise<void> => {
    if (haio) {
      haio.stop()
    }
  },
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
    const res = createAccount(count)
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
        nodeRunning: undefined,
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
    monadScore ||= new MonadScore(event)
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
    if (monadScore) {
      monadScore.stop()
      event.reply('toastMessage', {
        status: 'success',
        message: 'MonadScore 已停止'
      })
    }
  },
  startFlow3: async (
    event: IpcMainEvent,
    options: {
      concurrency: number
      proxyMode: ProxyMode
      proxyApiUrl: string
    }
  ): Promise<void> => {
    flow3 ||= new Flow3(event)
    const { concurrency, proxyMode, proxyApiUrl } = options
    electronStore.set('flow3.concurrency', concurrency)
    electronStore.set('flow3.proxyMode', proxyMode)
    electronStore.set('flow3.proxyApiUrl', proxyApiUrl)
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
    event.reply('toastMessage', {
      status: 'success',
      message: 'Flow3 已停止'
    })
  }
}
