import puppeteer from 'puppeteer-core'
import { SMSActive } from '../../utils/SMSActive'
import { electronStore } from '../../store'
interface GmailAccount {
  firstName: string
  lastName?: string
  email: string
  password: string
  year: string
  month: string
  day: string
  gender: string
}
export const registerGmailAccount = async (
  options: GmailAccount,
  proxy?: string
) => {
  const {
    firstName,
    email,
    password,
    year,
    month,
    day,
    gender,
    lastName = ''
  } = options
  const args: string[] = [
    '--lang=en-US',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--mute-audio'
  ]
  if (proxy) {
    args.push('--proxy-server=http://' + proxy)
  }
  const browser = await puppeteer.launch({
    channel: 'chrome',
    headless: false,
    args
  })
  const page = await browser.newPage()
  // await page.setUserAgent(faker.internet.userAgent())
  await page.goto(
    'https://accounts.google.com/signup/v2/webcreateaccount?hl=en&flowName=GlifWebSignIn&flowEntry=SignUp'
  )
  const url = page.url()
  if (
    url.includes(
      'https://accounts.google.com/lifecycle/steps/signup/unknownerror'
    )
  ) {
    await page
      .locator(
        '#yDmH0d > c-wiz > div > div.JYXaTc > div > div > div > div > button > div.VfPpkd-RLmnJb'
      )
      .click()
  }

  await page.locator('#firstName').fill(firstName)
  await page.locator('#lastName').fill(lastName)
  await page
    .locator('#collectNameNext > div > button > div.VfPpkd-RLmnJb')
    .click()
  // timeout:1000
  await page.locator('#month').fill(month)
  await page.locator('#day').fill(day)
  await page.locator('#year').fill(year)
  await page.locator('#gender').fill(gender)

  await page
    .locator('#birthdaygenderNext > div > button > div.VfPpkd-RLmnJb')
    .click()
  try {
    await page
      .locator(
        '#yDmH0d > c-wiz > div > div.UXFQgc > div > div > div > form > span > section > div > div > div > div.AFTWye > div > div.aCsJod.oJeWuf > div > div.Xb9hP > input'
      )
      .fill(email)
    // 内部执行js逻辑
    await page.evaluate(() => {
      const nextButton = document.querySelector('#next') as HTMLElement
      nextButton?.click()
      console.log('内部执行js逻辑')
    })
  } catch (error) {
    await page
      .locator(
        '#yDmH0d > c-wiz > div > div.UXFQgc > div > div > div > form > span > section > div > div > div.myYH1.v5IR3e.V9RXW > div.Hy62Fc > div > span > div:nth-child(1)'
      )
      .click()
    await page.locator('#next').click()
  }
  await page
    .locator('#passwd > div.aCsJod.oJeWuf > div > div.Xb9hP > input')
    .fill(password)
  await page
    .locator('#confirm-passwd > div.aCsJod.oJeWuf > div > div.Xb9hP > input')
    .fill(password)
  await page
    .locator(
      '#yDmH0d > c-wiz > div > div.UXFQgc > div > div > div > form > span > section > div > div > div > div.v8aRxf > div > div.Hy62Fc > div > div > div.uxXgMe > div > div > input'
    )
    .click()
  await page.locator('#createpasswordNext').click()

  const sms = new SMSActive(electronStore.get('smsActiveApiKey') as string)
  const [orderId, phone] = await sms.getAvailablePhoneNumber('0')
  console.log(orderId, phone)
}
