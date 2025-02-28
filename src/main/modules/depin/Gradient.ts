import { IpcMainEvent } from 'electron'
import { DePIN } from '.'
import { electronStore } from '../../store'
import { WebDriver } from 'selenium-webdriver'
import { GradientAccount } from '../../../types/account'
const extensionId = 'caacbgbklghmpodbdafajbgdnegacfmo'
const crx =
  'https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=112&x=id%3D${extensionId}%26installsource%3Dondemand%26uc'
export default class Gradient extends DePIN {
  constructor(event: IpcMainEvent) {
    super(event, 'gradient', { intervalSeconds: 30 * 1000 })
  }

  async ready() {
    const chromePath = await this.findChromePath()
    if (!chromePath) {
      const message = '未找到Chrome路径，请安装Chrome浏览器，或在后台手动设置'
      this.logger(message)
      this.event.reply('toastMessage', {
        type: 'error',
        message
      })
      this.isRunning = false
      throw new Error(message)
    }
    const extensionPath = await this.loadExtension(crx, extensionId)
    return { chromePath, extensionPath }
  }
  gotoLogin(driver: WebDriver, account: GradientAccount) {
    this.logger('等待登录表单加载...')
  }

  async run() {
    this.preRun()
    const { chromePath, extensionPath } = await this.ready()
    const gradientAccounts = electronStore.get('gradientAccounts')
    for (const account of gradientAccounts) {
      if (!this.isRunning) return
      const { ua, proxy, email, password } = account
      const driver = await this.loadDriver(chromePath, {
        headless: true,
        userAgent: ua,
        extension: extensionPath,
        proxy
      })
      try {
        await this.checkWebsiteAvailable(
          driver,
          'https://app.gradient.network/'
        )
      } catch (error) {
        console.error(error)
        this.logger('网站访问失败,请检查网络连接和代理设置')
        this.isRunning = false
      }
      await this.gotoLogin(driver, account)
    }
  }
}
