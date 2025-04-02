import { Keypair } from '@solana/web3.js'
import { electronStore } from '../../store'
import { getRandomUserAgent } from '../../config/userAgent'
import Haio from '../../modules/depin/Haio'
import bs58 from 'bs58'
import { IpcMainEvent } from 'electron'

let haio: Haio

export const HaioActions: Record<
  string,
  (event: IpcMainEvent, ...args: any[]) => Promise<void>
> = {
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
  }
}
