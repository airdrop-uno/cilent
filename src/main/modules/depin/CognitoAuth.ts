import { CognitoUserPool, AuthenticationDetails, CognitoUser, CognitoRefreshToken } from 'amazon-cognito-identity-js'

export interface CognitoAuthResult {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
}

export class CognitoAuth {
  protected username: string
  protected password: string
  protected userPool: CognitoUserPool
  protected authenticationDetails: AuthenticationDetails
  protected cognitoUser: CognitoUser
  constructor(username: string, password: string, userPool: CognitoUserPool) {
    this.username = username
    this.password = password
    this.userPool = userPool
    this.authenticationDetails = new AuthenticationDetails({ Username: username, Password: password })
    this.cognitoUser = new CognitoUser({ Username: username, Pool: userPool })
  }

  authenticate(): Promise<CognitoAuthResult> {
    return new Promise((resolve, reject) => {
      this.cognitoUser.authenticateUser(this.authenticationDetails, {
        onSuccess: (result) =>
          resolve({
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
            expiresIn: result.getAccessToken().getExpiration() * 1000 - Date.now()
          }),
        onFailure: (err) => reject(err),
        newPasswordRequired: () => reject(new Error('需要设置新密码'))
      })
    })
  }

  refreshSession(refreshToken: string): Promise<CognitoAuthResult> {
    return new Promise((resolve, reject) => {
      this.cognitoUser.refreshSession(new CognitoRefreshToken({ RefreshToken: refreshToken }), (err, result) => {
        if (err) reject(err)
        else
          resolve({
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: refreshToken,
            expiresIn: result.getAccessToken().getExpiration() * 1000 - Date.now()
          })
      })
    })
  }
}
