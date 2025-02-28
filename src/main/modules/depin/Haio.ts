import { DePIN } from '.'
import { IpcMainEvent } from 'electron'
import { electronStore } from '../../store'
import { HaioAccount } from '../../../types/account'

export default class Haio extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'haio', {
      baseURL: 'https://haio.com'
    })
  }
  async requestChallenge(account: HaioAccount) {
    this.setBaseURL('https://prod-api.haio.fun/api/auth')
    const { headers, httpsAgent } = await this.getHeaders(account)
    const {
      success,
      content: { message }
    } = await this.request.post<{
      success: boolean
      content: { message: string }
    }>(
      '/request-challenge',
      { publicKey: account.address },
      { headers, httpsAgent }
    )
    if (!success) throw new Error(`requestChallenge failed ${account.address}`)
    return message
  }
  async getToken(account: HaioAccount) {
    this.logger(`开始获取Haio ${account.address}的token`)
    this.setBaseURL('https://prod-api.haio.fun/api/auth')
    const message = await this.requestChallenge(account)
    const signature = this.signMessage(message, account.privateKey)
    if (!signature) throw new Error(`signMessage failed ${account.address}`)
    const { headers, httpsAgent } = await this.getHeaders(account)
    const {
      success,
      content: { accessToken }
    } = await this.request.post<{
      success: boolean
      content: { accessToken: string }
    }>(
      '/verify',
      {
        publicKey: account.address,
        signature
      },
      {
        headers,
        httpsAgent
      }
    )
    if (!success) throw new Error(`getToken failed ${account.address}`)
    this.logger(`获取Haio ${account.address}的token成功`)
    return accessToken
  }
  async setReferral(account: HaioAccount) {
    this.setBaseURL('https://login-er46geo74a-uc.a.run.app/')
    const { headers, httpsAgent } = await this.getHeaders(account)
    const { referralCode } = electronStore.get('haio')
    const { success } = await this.request.post<{ success: boolean }>(
      '/',
      { referralCode },
      { headers, httpsAgent }
    )
    if (!success)
      throw new Error(`❌ Failed to use referral ${account.address}`)
    this.logger(`✅ Referral Applied Successfully!`)
  }
  async claimReward(account: HaioAccount) {
    this.setBaseURL('https://claimscratchboxcoupon-er46geo74a-uc.a.run.app/')
    const { headers, httpsAgent } = await this.getHeaders(account)
    const { success } = await this.request.post<{ success: boolean }>(
      '/',
      {},
      { headers, httpsAgent }
    )
    if (!success)
      throw new Error(`❌ Failed to claim reward ${account.address}`)
    this.logger(`✅ Reward Claimed Successfully!`)
  }

  async run() {
    this.preRun()
    const { accounts, referralCode } = electronStore.get('haio')
    if (!referralCode)
      throw new Error(
        `❌ No referral code found, please set referral code first`
      )
    for (const account of accounts) {
      this.queue.add(async () => {
        await this.getToken(account)
        await this.setReferral(account)
        await this.claimReward(account)
      })
    }
  }
}
