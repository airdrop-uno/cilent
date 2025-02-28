import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { CognitoAuth, CognitoAuthResult } from './CognitoAuth'

export class TokenManager {
  public username: string
  public password: string
  public userPool: CognitoUserPool
  public accessToken: string | null
  public refreshToken: string | null
  public idToken: string | null
  public expiresAt: number
  public auth: CognitoAuth
  public token:
    | (Omit<CognitoAuthResult, 'expiresIn'> & {
        isAuthenticated: boolean
        isVerifying: boolean
      })
    | null
  constructor(username: string, password: string, userPool: CognitoUserPool) {
    this.username = username
    this.password = password
    this.userPool = userPool
    this.accessToken = null
    this.refreshToken = null
    this.idToken = null
    this.token = null
    this.expiresAt = Date.now()
    this.auth = new CognitoAuth(username, password, this.userPool)
  }

  async getValidToken() {
    if (!this.accessToken || this.isTokenExpired())
      await this.refreshOrAuthenticate()
    return this.accessToken
  }

  isTokenExpired() {
    return Date.now() >= this.expiresAt
  }

  async refreshOrAuthenticate() {
    const result = this.refreshToken
      ? await this.auth.refreshSession(this.refreshToken)
      : await this.auth.authenticate()
    await this.updateTokens(result)
  }

  async updateTokens(result: CognitoAuthResult) {
    this.accessToken = result.accessToken
    this.idToken = result.idToken
    this.refreshToken = result.refreshToken
    this.expiresAt = Date.now() + result.expiresIn
    this.token = {
      accessToken: this.accessToken,
      idToken: this.idToken,
      refreshToken: this.refreshToken,
      isAuthenticated: true,
      isVerifying: false
    }
  }
}
