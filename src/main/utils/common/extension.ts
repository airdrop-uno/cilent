import { Browser, Page, Target } from 'puppeteer'
type MetamaskPage = 'home' | 'notification'
let extId
const password = 'password1234'
export const getMetamaskPage = (browser: Browser, pageName: MetamaskPage): Promise<Page | null> =>
  new Promise((resolve, reject) => {
    browser.on('targetcreated', async (target: Target) => {
      if (target.url().startsWith(`chrome-extension://${extId}/${pageName}.html`)) {
        try {
          const page = await target.page()
          resolve(page)
        } catch (e) {
          reject(e)
        }
      } else if (!extId && target.url().startsWith(`chrome-extension://`)) {
        try {
          extId = target.url().split('/')[2]
          const page = await target.page()
          resolve(page)
        } catch (e) {
          reject(e)
        }
      }
    })
  })
export const xPath = (_xPath: string) => `::-p-xpath(${_xPath})`
export const injectMetamask = async (browser: Browser, seeds: string) => {
  const metamaskPage = await getMetamaskPage(browser, 'home')
  if (metamaskPage) {
    await metamaskPage.goto(`chrome-extension://${extId}/home.html#initialize/create-password/import-with-seed-phrase`)
    await metamaskPage.locator(xPath('//*[@id="app-content"]/div/div[3]/div/div/form/div[4]/div[1]/div/input')).fill(seeds)
    await metamaskPage.locator('//*[@id="password"]').fill(password)
    await metamaskPage.locator('//*[@id="confirm-password"]').fill(password)
    await metamaskPage.locator('//*[@id="app-content"]/div/div[3]/div/div/form/div[7]/div').click()
    await metamaskPage.locator('//*[@id="app-content"]/div/div[3]/div/div/form/button').click()
    await metamaskPage.locator('//*[@id="app-content"]/div/div[3]/div/div/button').click()
    await metamaskPage.locator('//*[@id="popover-content"]/div/div/section/header/div/button').click()
    await metamaskPage.close()
  }
}

export const signMessage = async (browser: Browser) => {
  const notifyPage = await getMetamaskPage(browser, 'notification')
  if (!notifyPage) return
  await notifyPage.locator('[data-testid="request-signature__sign"]').click()
}

export const initOpensea = async (browser: Browser) => {
  const page = await browser.newPage()
  await page.goto('https://opensea.io/account/locked')
  await page.locator('//*[@id="__next"]/div[1]/main/div/div/div/div[1]/div[2]/button').click()

  const notifyPage = await getMetamaskPage(browser, 'notification')
  if (!notifyPage) return

  await notifyPage.locator('//*[@id="app-content"]/div/div[3]/div/div[2]/div[4]/div[2]/button[2]').click()
  await notifyPage.locator('//*[@id="app-content"]/div/div[3]/div/div[2]/div[2]/div[2]/footer/button[2]').click()
  await page.close()
}
