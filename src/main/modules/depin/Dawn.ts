import { IpcMainEvent } from 'electron'
import { electronStore } from '../../store'
import { DawnAccount } from '../../../types/account'
import { DePIN } from '.'
import { getRandomUserAgent } from '../../config/userAgent'
import { solveTwoCaptcha } from '../captcha'
export default class Dawn extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'dawn', {
      intervalSeconds: 30 * 1000,
      baseURL: 'https://www.aeropres.in/chromeapi/dawn/v1',
      defaultHeaders: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        Origin: `chrome-extension://fpdkjdnhkakefebpekbdhillbhonfjjp`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      }
    })
  }
  async process(account: DawnAccount) {
    const { email, token, proxy, ua } = account
    this.logger(`开始处理${email}`)
    try {
      const httpsAgent = await this.getHeaders({ proxy, userAgent: ua })
      const response = await this.request.post<{ data: unknown }>(
        '/user/nodes/ping',
        {
          type: 'extension'
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          httpsAgent
        }
      )
    } catch (error) {
      this.logger(`${email} 处理失败: ${(error as any).message}`)
    }
  }
  generateAppId() {
    const hexDigits = '0123456789abcdefABCDEF'
    const randomPart = Array.from(
      { length: 22 },
      () => hexDigits[Math.floor(Math.random() * hexDigits.length)]
    )
      .join('')
      .toLowerCase()
    return `67${randomPart}`
  }
  async getPuzzleId(appid: string) {
    const {
      data: { puzzle_id }
    } = await this.request.get<{ data: { puzzle_id: string } }>(
      `/puzzle/get-puzzle?appid=${appid}`,
      { headers: {} }
    )
    return puzzle_id
  }
  async getPuzzleImage(puzzleId: string, appid: string) {
    const {
      data: { imgBase64 }
    } = await this.request.get<{ data: { imgBase64: string } }>(
      `//puzzle/get-puzzle-image?puzzle_id=${puzzleId}&appid=${appid}`,
      { headers: {} }
    )
    return imgBase64
  }
  async getToken(email: string, password, string, proxy: string) {
    const appid = this.generateAppId()
    const puzzleId = await this.getPuzzleId(appid)
    const puzzleImage = await this.getPuzzleImage(puzzleId, appid)
    const captcha = await solveTwoCaptcha(puzzleImage)
    const {
      data: { token }
    } = await this.request.post<{ data: { token: string } }>(
      `/user/login/v2?appid=${appid}`,
      {
        username: email,
        password: password,
        logindata: {
          _v: { version: '1.1.3' },
          datetime: new Date().toISOString()
        },
        puzzle_id: puzzleId,
        ans: captcha,
        appid
      },
      { headers: {} }
    )
    return token
  }
  async run() {
    const dawnAccounts = electronStore.get('dawnAccounts')
    for (const account of dawnAccounts) {
      const { email, ua, token } = account
      if (!token) {
        this.logger(`${email} has no token`)
        continue
      }
      if (!ua) {
        account.ua = getRandomUserAgent()
        electronStore.set('dawnAccounts', dawnAccounts)
      }
      await this.process(account)
    }
  }
}
