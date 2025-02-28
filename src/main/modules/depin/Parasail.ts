import { IpcMainEvent } from 'electron'
import { ethers } from 'ethers'
import { DePIN } from './index'
import { electronStore } from '../../store'
import { ParasailAccount } from '../../../types/account'
import { getProxyAgent } from '../../utils/depin'

const msg = `By signing this message, you confirm that you agree to the Parasail Terms of Service.

Parasail (including the Website and Parasail Smart Contracts) is not intended for:
(a) access and/or use by Excluded Persons;
(b) access and/or use by any person or entity in, or accessing or using the Website from, an Excluded Jurisdiction.

Excluded Persons are prohibited from accessing and/or using Parasail (including the Website and Parasail Smart Contracts).

For full terms, refer to: https://parasail.network/Parasail_User_Terms.pdf`
export default class Parasail extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'Parasail', {
      intervalSeconds: 60 * 60 * 1000,
      baseURL: 'https://www.parasail.network'
    })
  }

  getHeaders(account: ParasailAccount, authorization = true) {
    const { token, userAgent, proxy } = account
    const httpsAgent = getProxyAgent(proxy)
    return {
      httpsAgent,
      headers: {
        Authorization: authorization ? `Bearer ${token}` : null,
        'User-Agent': userAgent,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*'
      }
    }
  }

  updateAccount(account: ParasailAccount) {
    const accounts = electronStore.get('parasailAccounts')
    const index = accounts.findIndex((a) => a.address === account.address)
    if (index !== -1) {
      accounts[index] = account
    } else {
      accounts.push(account)
    }
    electronStore.set('parasailAccounts', accounts)
  }

  async refreshToken(account: ParasailAccount): Promise<ParasailAccount> {
    const wallet = new ethers.Wallet(account.privateKey as string)
    this.logger(`start refresh user token: ${wallet.address}`)
    const signature = await wallet.signMessage(msg)
    try {
      const { headers, httpsAgent } = await this.getHeaders(account, false)
      const { token } = await this.request.post<{ token: string }>(
        '/api/user/verify',
        {
          address: wallet.address,
          msg,
          signature
        },
        {
          headers,
          httpsAgent
        }
      )
      this.logger(
        `refresh user token ${wallet.address} success! token: ${token}`
      )
      account.token = token
      this.updateAccount(account)
      return account
    } catch (error: any) {
      if (error.response) {
        this.logger(`Refresh token ${wallet.address} Error Details:`)
        this.logger(`Status: ${error.response.status}`)
        this.logger(`Data: ${JSON.stringify(error.response.data)}`)
        this.logger(`Headers: ${JSON.stringify(error.response.headers)}`)
      } else if (error.request) {
        this.logger(`No response received: ${error.request}`)
      } else {
        this.logger(`Error setting up request: ${error.message}`)
      }
      throw error
    }
  }
  async onboard(account: ParasailAccount) {
    const { address } = account
    try {
      this.logger(`start onboard node: ${address}`)
      const { headers, httpsAgent } = await this.getHeaders(account, true)
      await this.request.post(
        '/api/v1/node/onboard',
        { address },
        { headers, httpsAgent }
      )
      this.logger(`onboard node ${address} success!`)
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        this.logger('Token expired. Attempting to refresh...')
        await this.refreshToken(account)
        return this.onboard(account)
      }

      if (error.response) {
        this.logger(`Onboarding Error Details:`)
        this.logger(`Status: ${error.response.status}`)
        this.logger(`Data: ${JSON.stringify(error.response.data)}`)
        this.logger(`Headers: ${JSON.stringify(error.response.headers)}`)
      }

      this.logger(`Onboarding error: ${error.message}`)
      throw error
    }
  }
  async checkIn(account: ParasailAccount) {
    const { address } = account
    try {
      this.logger(`start onboard node: ${address}`)
      const { headers, httpsAgent } = await this.getHeaders(account, true)
      await this.request.post(
        '/api/v1/node/check_in',
        { address },
        { headers, httpsAgent }
      )
      this.logger(`check in node ${address} success!`)
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        this.logger('Token expired. Attempting to refresh...')
        await this.refreshToken(account)
        return this.checkIn(account)
      }

      if (error.response) {
        this.logger(`Check-in Error Details:`)
        this.logger(`Status: ${error.response.status}`)
        this.logger(`Data: ${JSON.stringify(error.response.data)}`)
        this.logger(`Headers: ${JSON.stringify(error.response.headers)}`)
      }

      this.logger(`Check-in error: ${error.message}`)
      throw error
    }
  }
  async getNodeStats(account: ParasailAccount) {
    const { address } = account
    try {
      this.logger(`start get node stats: ${address}`)
      const { headers, httpsAgent } = await this.getHeaders(account, true)
      const {
        data: {
          has_node,
          node_address,
          points,
          pending_rewards,
          total_distributed,
          last_checkin_time,
          card_count
        }
      } = await this.request.post<{
        data: {
          has_node: boolean
          node_address: string
          points: number
          pending_rewards: number
          total_distributed: number
          last_checkin_time: number
          card_count: number
        }
      }>('/api/v1/node/node_stats', { address }, { headers, httpsAgent })
      this.logger(`get node stats ${address} success! details:`)
      this.logger(`Has Node: ${has_node}`)
      this.logger(`Node Address: ${node_address}`)
      this.logger(`Points: ${points}`)
      this.logger(`Pending Rewards: ${pending_rewards}`)
      this.logger(`Total Distributed: ${total_distributed}`)
      this.logger(`Last Check-in: ${last_checkin_time}`)
      this.logger(`Card Count: ${card_count}`)
      return {
        has_node,
        node_address,
        points,
        pending_rewards,
        total_distributed
      }
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        this.logger('Token expired. Attempting to refresh...')
        await this.refreshToken(account)
        return this.getNodeStats(account)
      }

      if (error.response) {
        this.logger(`Node Stats Error Details:`)
        this.logger(`Status: ${error.response.status}`)
        this.logger(`Data: ${JSON.stringify(error.response.data)}`)
        this.logger(`Headers: ${JSON.stringify(error.response.headers)}`)
      }

      this.logger(`Failed to fetch node stats: ${error.message}`)
      throw error
    }
  }
  async run() {
    if (this.isRunning) {
      this.logger('Parasail is already running')
      return
    }
    this.isRunning = true
    const accounts = electronStore.get('parasailAccounts')
    for (const account of accounts) {
      if (account.privateKey) {
        this.queue.add(async () => {
          await this.onboard(account)
          await this.checkIn(account)
          await this.getNodeStats(account)
        })
      }
    }
  }
}
