import { Solver } from '@2captcha/captcha-solver'
import { electronStore } from '../store'

export const getCaptchaSolver = (): Solver => {
  const recaptchaToken = electronStore.get('recaptchaToken')
  if (!recaptchaToken) {
    throw new Error('Recaptcha token not found')
  }
  return new Solver(recaptchaToken)
}
