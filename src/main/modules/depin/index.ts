export class DePIN {
  protected email: string
  protected password: string
  protected proxy: string
  protected token: string
  constructor(email: string, password: string, proxy: string, token: string) {
    this.email = email
    this.password = password
    this.proxy = proxy
    this.token = token
  }
}
