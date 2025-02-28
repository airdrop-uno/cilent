import puppeteer from 'puppeteer-extra'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import { injectMetamask } from './common/extension'
import { Browser } from 'puppeteer'
import { electronStore } from '../store'
const metamaskPath = '/Users/terry/Downloads/metamask-chrome-11.5.1'
export interface IProxy {
  host: string
  port: number
}

export interface Options {
  proxy?: IProxy
  captcha?: boolean
  headless?: boolean
}
const defaultArgs = [
  `--enable-automation`,
  `--window-size=1280,720`,
  '--disable-web-security',
  '--allow-running-insecure-content'
]
export const getNormalBrowser = ({
  captcha,
  proxy,
  headless
}: Options): Promise<Browser> =>
  new Promise((resolve, reject) => {
    const recaptchaToken = electronStore.get('recaptchaToken')
    if (captcha) {
      puppeteer.use(
        RecaptchaPlugin({
          provider: {
            id: '2captcha',
            token: recaptchaToken
          },
          visualFeedback: true
        })
      )
    }
    const args = [...defaultArgs]
    if (proxy) {
      args.push(`--proxy-server=${proxy.host}:${proxy.port}`)
    }
    puppeteer
      .launch({
        headless,
        // executablePath: chromeExecutablePath,
        args
      })
      .then(resolve)
      .catch(reject)
  })

export const getMetaMaskBrowser = async (
  seeds: string,
  {
    captcha,
    proxy,
    headless
  }: {
    captcha?: boolean
    proxy?: IProxy
    headless?: boolean
  }
): Promise<Browser> => {
  const recaptchaToken = electronStore.get('recaptchaToken')
  const chromeExecutablePath = electronStore.get('chromeExecutablePath')
  if (captcha) {
    puppeteer.use(
      RecaptchaPlugin({
        provider: {
          id: '2captcha',
          token: recaptchaToken
        },
        visualFeedback: true
      })
    )
  }
  const args = [
    // ...defaultArgs,
    `--disable-extensions-except=${metamaskPath}`,
    `--load-extension=${metamaskPath}`
  ]
  if (proxy) {
    args.push(`--proxy-server=${proxy.host}:${proxy.port}`)
  }
  console.log({ captcha, proxy, headless, chromeExecutablePath, metamaskPath })
  const browser = await puppeteer.launch({
    headless: false,
    // executablePath: chromeExecutablePath,
    args: [
      `--disable-extensions-except=${metamaskPath}`,
      `--load-extension=${metamaskPath}`
    ]
  })
  console.log('injectMetamask')
  await injectMetamask(browser, seeds)
  return browser
}
