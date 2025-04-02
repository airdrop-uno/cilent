import { IpcMainEvent, app } from 'electron'
import PQueue from 'p-queue'
import os from 'os'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import crypto from 'crypto'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import https from 'https'
import * as chrome from 'selenium-webdriver/chrome'
import { Builder, By, WebDriver } from 'selenium-webdriver'
import { getRandomUserAgent } from '../../config/userAgent'
import { Request } from '../base/request'
import { getProxyAgent } from '../../utils/depin'
import { Keypair } from '@solana/web3.js'
import { ScheduledTask } from 'node-cron'
import { electronStore, StaticProxyItem } from '../../store'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { ProxyMode } from '../../../types/account'
export class DePIN {
  protected event: IpcMainEvent
  protected queue: PQueue
  protected intervalSeconds: number
  protected name: string
  public isRunning: boolean = false
  protected request!: Request
  protected defaultHeaders: Record<string, string> = {}
  protected timer: NodeJS.Timeout | null = null
  protected cronTask: ScheduledTask | null = null
  protected proxyMode: ProxyMode = 'None'
  protected proxyDynamicUrl: string = ''
  protected timers: NodeJS.Timeout[] = []
  protected cronTasks: ScheduledTask[] = []
  constructor(
    event: IpcMainEvent,
    name: string,
    options: {
      intervalSeconds?: number
      baseURL?: string
      defaultHeaders?: Record<string, string>
      concurrency?: number
    }
  ) {
    this.event = event

    const {
      intervalSeconds,
      baseURL,
      defaultHeaders,
      concurrency = os.cpus().length
    } = options
    this.queue = new PQueue({
      concurrency
    })
    this.intervalSeconds = intervalSeconds || 30 * 1000
    this.name = name
    if (baseURL) {
      this.request = new Request(baseURL)
    }
    if (defaultHeaders) {
      this.defaultHeaders = defaultHeaders
    }
  }
  setBaseURL(baseURL: string) {
    this.request = new Request(baseURL)
  }
  setConcurrency(concurrency: number) {
    this.queue.concurrency = concurrency
  }
  setProxyMode(proxyMode: ProxyMode) {
    this.proxyMode = proxyMode
  }
  setProxyDynamicUrl(proxyDynamicUrl: string) {
    this.proxyDynamicUrl = proxyDynamicUrl
  }
  stop() {
    this.queue.pause()
    this.queue.clear()
    this.isRunning = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.cronTask) {
      this.cronTask.stop()
    }
    for (const timer of this.timers) {
      clearInterval(timer)
    }
    for (const cronTask of this.cronTasks) {
      cronTask.stop()
    }
    this.cronTasks = []
    this.timers = []
  }
  preRun() {
    if (this.isRunning) {
      const message = `${this.name}已运行；请先停止！！！`
      this.event.reply('toastMessage', {
        status: 'error',
        message
      })
      throw new Error(message)
    }
    this.stop()
    this.queue.start()
    this.cronTask?.start()
    this.isRunning = true
    this.event.reply('toastMessage', {
      status: 'success',
      message: `${this.name} 已启动`
    })
  }
  async getHeaders(
    options: { userAgent?: string; proxy?: string; token?: string },
    extraHeaders?: Record<string, unknown>
  ) {
    let httpsAgent: HttpsProxyAgent<string> | SocksProxyAgent | null = null
    if (this.proxyMode === 'Static') {
      httpsAgent = getProxyAgent(options.proxy)
    } else if (this.proxyMode === 'Dynamic') {
      const res = await axios.get(this.proxyDynamicUrl)
      httpsAgent = getProxyAgent(res.data)
    }
    console.log(httpsAgent)
    return {
      headers: {
        ...this.defaultHeaders,
        'User-Agent': options.userAgent,
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...extraHeaders
      },
      httpsAgent
    }
  }
  logger(message: string) {
    this.event.reply(`${this.name}Log`, { type: 'info', message })
  }
  toast(message: string) {
    this.event.reply('toastMessage', {
      status: 'info',
      message
    })
  }

  get randomProxy(): StaticProxyItem {
    const list = electronStore.get('staticProxy')
    return list[Math.floor(Math.random() * list.length)]
  }

  get now(): string {
    return new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Shanghai'
    })
  }

  signMessage(message: string, privateKey: string) {
    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey))
    const signature = nacl.sign.detached(
      Buffer.from(message),
      new Uint8Array(wallet.secretKey)
    )
    return bs58.encode(signature)
  }

  async findChromePath(): Promise<string | false> {
    // 判断操作系统
    const platform = os.platform()
    const pathList: string[] = []
    if (platform === 'win32') {
      pathList.push(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      )
    }
    if (platform === 'darwin') {
      pathList.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      )
    }
    for (const path of pathList) {
      if (fs.existsSync(path)) {
        return path
      }
    }
    return false
  }

  async loadExtension(crxUrl: string, extensionId: string): Promise<string> {
    const url = crxUrl.replace('${extensionId}', extensionId)
    const headers = {
      'User-Agent': getRandomUserAgent(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
    const extensionFilename = `${extensionId}.crx`
    this.logger(`开始下载扩展，地址:${url}`)
    const extensionPath = path.join(
      app.getPath('userData'),
      `extensions/${extensionFilename}`
    )
    if (fs.existsSync(extensionPath)) {
      fs.unlinkSync(extensionPath)
    }
    try {
      const { status, data } = await axios.get(crxUrl, { headers })
      if (status !== 200) {
        this.logger(`下载扩展失败:${status}`)
        throw new Error(`下载扩展失败:${status}`)
      }
      fs.writeFileSync(extensionPath, data)
      this.logger(`下载扩展成功:${extensionPath}`)
      const md5 = crypto.createHash('md5').update(data).digest('hex')
      this.logger(`扩展${extensionId} MD5:${md5}`)
      return extensionPath
    } catch (error) {
      this.logger(`下载扩展出错:${(error as any).message}`)
      throw error
    }
  }

  async loadDriver(
    chromePath: string,
    options: {
      userAgent: string
      proxy?: string
      headless?: boolean
      extension?: string
    }
  ) {
    // const { userAgent, proxy, headless, extension } = options
    // const chromeOptions = new chrome.Options()
    //   .setChromeBinaryPath(chromePath)
    //   .addArguments('--no-sandbox')
    //   .addArguments('--disable-dev-shm-usage')
    //   .addArguments('--disable-gpu')
    //   .addArguments('--window-size=1920,1080')
    //   .addArguments(`--user-agent=${userAgent}`)
    //   .addArguments('--disable-web-security')
    //   .addArguments('--ignore-certificate-errors')
    //   .addArguments('--dns-prefetch-disable')
    //   .addArguments('--disable-features=IsolateOrigins,site-per-process')
    //   .addArguments('--proxy-bypass-list=<-loopback>')
    //   .addArguments(
    //     '--host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE localhost"'
    //   )
    // if (headless) {
    //   chromeOptions.addArguments('--headless=new')
    // }
    // if (proxy) {
    //   const proxyUrl = new URL(proxy)
    //   chromeOptions.addArguments(
    //     `--proxy-server=${proxyUrl.protocol}//${proxyUrl.hostname}:${proxyUrl.port}`
    //   )
    //   if (proxyUrl.hostname && proxyUrl.password) {
    //     chromeOptions.addArguments(
    //       `--proxy-auth=${proxyUrl.username}:${proxyUrl.password}`
    //     )
    //   }
    //   this.logger(`代理设置完成:${proxy}`)
    // }
    // if (extension) {
    //   chromeOptions.addExtensions(extension)
    //   this.logger(`扩展设置完成:${extension}`)
    // }
    try {
      const driver = await new Builder()
        .forBrowser('chrome')
        // .setChromeOptions(chromeOptions as any)
        .build()
      this.logger(`浏览器启动成功`)
      return driver
    } catch (error) {
      this.logger(`浏览器启动失败:${(error as any).message}`)
      throw error
    }
  }

  async checkWebsiteAvailable(
    driver: WebDriver,
    url: string,
    maxRetries = 3
  ): Promise<void> {
    this.logger(`检查网站${url}可访问性...`)
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.logger(`尝试访问网站 (第 ${i + 1} 次)...`)
        await driver.get(url)
        await driver.wait(async () => {
          const readyState = await driver.executeScript(
            'return document.readyState'
          )
          this.logger(`页面加载状态:${readyState}`)
          return readyState === 'complete'
        }, 30000)
        const title = await driver.getTitle()
        this.logger(`页面标题:${title}`)
        if (title.includes("can't be reached") || title.includes('ERR_')) {
          throw new Error('网站无法访问')
        }
        await driver.sleep(5000)

        const bodyText = await driver.findElement(By.css('body')).getText()
        if (
          bodyText.includes("This site can't be reached") ||
          bodyText.includes('ERR_') ||
          bodyText.includes('took too long to respond')
        ) {
          throw new Error('页面加载错误')
        }
        this.logger(`网站${url}访问正常`)
      } catch (error) {
        this.logger(`第 ${i + 1} 次尝试失败:${(error as any).message}`)
        if (i < maxRetries - 1) {
          this.logger('等待 10 秒后重试...')
          await driver.sleep(10000)
        } else {
          throw new Error('网站无法访问，请检查网络连接和代理设置')
        }
      }
    }
  }

  async requestWithRetry(
    callback: () => Promise<void>,
    retry: () => Promise<void>
  ) {
    try {
      await callback()
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        await retry()
        return await callback()
      }
      throw error
    }
  }
}
