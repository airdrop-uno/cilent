import axios from 'axios'

export interface SMSActiveOptions {
  action: string
  operator?: string
  country?: string
  forward?: string
  ref?: string
  id?: string
  status?: string
  service?: string
  [key: string]: unknown
}
export class SMSActive {
  private apiKey: string
  private baseUrl: string
  balance: number = 0
  constructor(apiKey: string, baseUrl?: string) {
    // 92898c5c8A9e6de0542f929e4fbd7536
    this.apiKey = apiKey
    this.baseUrl =
      baseUrl ?? 'https://api.sms-activate.ae/stubs/handler_api.php'
  }
  async request(options: SMSActiveOptions) {
    const start = Date.now()
    const params = new URLSearchParams({
      api_key: this.apiKey,
      ...options
    })
    const url = `${this.baseUrl}?${params.toString()}`
    const { data } = await axios.get(url)
    console.warn(url, { duration: Date.now() - start, data })
    return data
  }
  async getBalance() {
    const res = await this.request({
      action: 'getBalance'
    })
    if (res === 'BAD_KEY') throw new Error('API Key 错误')
    const [, balance] = res.split(':')
    this.balance = Number(balance)
  }
  //   https://api.sms-activate.ae/stubs/handler_api.php?api_key=92898c5c8A9e6de0542f929e4fbd7536&action=getNumbersStatus&country=0&operator=any

  async getAvailablePhoneNumber(country: string): Promise<[string, string]> {
    if (this.balance < 1) {
      throw new Error('Insufficient balance')
    }
    const res = await this.request({
      action: 'getNumbersStatus',
      operator: 'any',
      country
    })
    const key = Object.keys(res).find((key) => Number(res[key]) > 0)
    if (!key) {
      throw new Error('No available phone number')
    }
    console.log(key)
    const order = await this.request({
      action: 'getNumber',
      service: 'go',
      forward: '0',
      operator: 'any',
      ref: '11350864',
      country
    })
    console.log(order)
    const [, orderId, phone] = order.split(':')
    const status = await this.request({
      action: 'getStatus',
      id: orderId
    })
    if (status === 'STATUS_WAIT_CODE') return [orderId, phone]
    throw new Error('Failed to get phone number')
  }

  async activatePhoneNumber(orderId: string) {
    const res = await this.request({
      action: 'setStatus',
      status: '1',
      forward: '0',
      id: orderId
    })
    return res
  }

  async getCountries() {
    const res = await this.request({
      action: 'getCountries'
    })
    return Object.entries(res).map(([_key, value]) => value)
  }
}
