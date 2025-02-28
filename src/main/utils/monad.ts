import puppeteer from 'puppeteer-extra'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import { Wallet } from './wallet'

export const mintFaucet = (
  wallet: Wallet,
  recaptchaToken: string,
  executablePath: string,
  snapshotFolder: string,
  proxy?: { host: string; port: number }
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    process.env.DEBUG = 'puppeteer-extra,puppeteer-extra-plugin:*'
    puppeteer.use(
      RecaptchaPlugin({
        provider: {
          id: '2captcha',
          token: recaptchaToken
        },
        visualFeedback: true
      })
    )
    const args = ['--disable-web-security', '--allow-running-insecure-content']
    if (proxy) {
      args.push(`--proxy-server=${proxy.host}:${proxy.port}`)
    }
    puppeteer
      .launch({
        headless: true,
        executablePath,
        args
      })
      .then(async (browser) => {
        try {
          console.log('start mint', wallet)
          const page = await browser.newPage()
          await page.goto('https://testnet.monad.xyz/')
          await page.locator('#terms-accepted').click()
          await page.locator('div.jsx-1ea2276b31877ada.flex.gap-4 > button').click()
          await page.solveRecaptchas()
          await page.locator('div.w-full > div > input').fill(wallet.address)
          await page.locator('div.wallet-address-container > button').click()
          await page.waitForSelector('div.wallet-address-container > button', {
            timeout: 1000
          })
          await page.screenshot({
            path: `${snapshotFolder}/${wallet.address}.png`,
            clip: {
              x: 100,
              y: 1300,
              width: 600,
              height: 800
            }
          })
          console.log('mint success', wallet)
          await browser.close()
          resolve(true)
        } catch (error) {
          reject(error)
        }
      })
  })
