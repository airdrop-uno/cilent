import { Account } from '../../../types/account'
import { IpcMainEvent } from 'electron'
import { getNormalBrowser, Options } from '../puppeteer'

export const mintFaucet = (
  { address }: Account,
  snapshotFolder: string,
  event: IpcMainEvent,
  options: Options
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    getNormalBrowser(options)
      .then(async (browser) => {
        try {
          event.reply('monadFaucetProgress', {
            status: 'processing',
            address,
            message: 'start'
          })
          const page = await browser.newPage()
          await page.goto('https://testnet.monad.xyz/')
          event.reply('monadFaucetProgress', {
            status: 'processing',
            address,
            message: 'open monad page'
          })
          await page.locator('#terms-accepted').click()
          await page
            .locator('div.jsx-1ea2276b31877ada.flex.gap-4 > button')
            .click()
          event.reply('monadFaucetProgress', {
            status: 'processing',
            address,
            message: 'start resolve reCaptcha'
          })
          await page.solveRecaptchas()
          event.reply('monadFaucetProgress', {
            status: 'processing',
            message: 'resolved reCaptcha'
          })
          await page.locator('div.w-full > div > input').fill(address as string)
          await page.locator('div.account-address-container > button').click()
          await page.waitForSelector('div.account-address-container > button', {
            timeout: 1000
          })
          event.reply('monadFaucetProgress', {
            status: 'processing',
            message: 'screenshot',
            address
          })
          await page.screenshot({
            path: `${snapshotFolder}/${address}.png`,
            clip: {
              x: 100,
              y: 1300,
              width: 600,
              height: 800
            }
          })
          event.reply('monadFaucetProgress', {
            status: 'finished',
            address
          })
          await browser.close()
          resolve(true)
        } catch (error) {
          event.reply('monadFaucetProgress', {
            status: 'error',
            address,
            message: (error as any).message
          })
          reject(error)
        }
      })
      .catch((error) => {
        event.reply('monadFaucetProgress', {
          status: 'error',
          address,
          message: (error as any).message
        })
        reject(error)
      })
  })
