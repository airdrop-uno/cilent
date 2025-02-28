import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

export interface UserConfig {
  userDirectory: string
  chromeExecutablePath: string
  recaptchaToken: string
  address: string
}
export const appPath = app.getPath('userData')
export const configPath = join(appPath, 'config.json')

export const initConfig = (): void => {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, '{}')
  }
  const config = getConfig()
  if (!config.userDirectory) {
    updateConfig({ userDirectory: appPath })
  }
}
export const getConfig = (): UserConfig => {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8') || '{}')
  return config
}

export const resetConfig = (config: UserConfig): void => {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
}
export const updateConfig = (_config: Partial<UserConfig>): void => {
  resetConfig({ ...getConfig(), ..._config })
}
