import { IpcMainEvent } from 'electron'
import { DePIN } from '.'
import { ethers } from 'ethers'
import { IncentivAccount } from '../../../types/account'
import { electronStore } from '../../store'
import { sleep } from '../../utils/common'

const PROVIDER_TYPE = 'BROWSER_EXTENSION'
export default class Incentiv extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'Incentiv', {
      baseURL: 'https://api.testnet.incentiv.net/api',
      defaultHeaders: {
        accept: 'application/json',
        'content-type': 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua':
          '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        Referer: 'https://testnet.incentiv.net/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    })
  }
  updateWallet(account: IncentivAccount) {
    const { accounts } = electronStore.get('incentiv')
    const index = accounts.findIndex((w) => w.address === account.address)
    if (index !== -1) {
      accounts[index] = account
    }
    electronStore.set('incentiv.accounts', accounts)
  }
  async getChallenge(address: string) {
    const { headers, httpsAgent } = await this.getHeaders({})
    const res = await this.request.get<{
      result: {
        challenge: string
      }
    }>('/user/challenge', {
      params: {
        type: PROVIDER_TYPE,
        address
      },
      headers,
      httpsAgent
    })
    return res.result.challenge
  }
  async signup(account: IncentivAccount) {
    const signer = new ethers.Wallet(account.privateKey)
    const challenge = await this.getChallenge(account.address)
    const signature = await signer.signMessage(challenge)
    const { headers, httpsAgent } = await this.getHeaders({})
    const res = await this.request.post<{
      result: {
        token: string
      }
    }>(
      '/user/signup',
      {
        type: PROVIDER_TYPE,
        challenge,
        signature,
        username: `user_${account.address.slice(2, 8)}`
      },
      {
        headers,
        httpsAgent
      }
    )
    account.registered = true
    account.token = res.result.token
    this.updateWallet(account)
  }

  async login(account: IncentivAccount) {
    const signer = new ethers.Wallet(account.privateKey)
    const challenge = await this.getChallenge(account.address)
    const signature = await signer.signMessage(challenge)
    const { headers, httpsAgent } = await this.getHeaders({})
    const res = await this.request.post<{
      result: {
        token: string
      }
    }>(
      '/user/login',
      {
        type: PROVIDER_TYPE,
        challenge,
        signature
      },
      {
        headers,
        httpsAgent
      }
    )
    account.token = res.result.token
    this.updateWallet(account)
  }
  async claimFaucet(account: IncentivAccount) {
    const { headers, httpsAgent } = await this.getHeaders({})
    const response = await this.requestWithRetry(
      async () => {
        const res = await this.request.post<{
          result: {
            token: string
          }
        }>(
          '/user/faucet',
          {},
          {
            headers: {
              ...headers,
              token: account.token
            },
            httpsAgent
          }
        )
        const userInfo = await this.getUserInfo(account)
        account.nextFaucetTimestamp = userInfo.nextFaucetTimestamp
        this.updateWallet(account)
        return res.result
      },
      async () => {
        await this.login(account)
      }
    )
    return response
  }
  async getUserInfo(account: IncentivAccount) {
    const { headers, httpsAgent } = await this.getHeaders({})
    const response = await this.requestWithRetry(
      async () => {
        const res = await this.request.get<{
          result: {
            nextFaucetTimestamp: number
          }
        }>('/user', {
          headers: {
            ...headers,
            token: account.token
          },
          httpsAgent
        })
        return res.result
      },
      async () => {
        await this.login(account)
      }
    )
    return response
  }
  async process(account: IncentivAccount) {
    if (!account.registered) {
      await this.signup(account)
    }
    if (
      !account.nextFaucetTimestamp ||
      account.nextFaucetTimestamp < Date.now()
    ) {
      await this.claimFaucet(account)
    } else {
      this.logger(
        `${account.address} next faucet timestamp: ${account.nextFaucetTimestamp}`
      )
      setTimeout(async () => {
        this.queue.add(async () => {
          await this.process(account)
        })
      }, account.nextFaucetTimestamp - Date.now())
    }
  }
  async run() {
    this.preRun()
    const { accounts } = electronStore.get('incentiv')
    for (const account of accounts) {
      this.queue.add(async () => {
        await this.process(account)
      })
    }
  }
}
