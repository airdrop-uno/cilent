import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

export const configPath = join(app.getPath('userData'), 'config.json')
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, '{}')
}
export const getConfig = (): Record<string, unknown> => {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8') || '{}')
  return config
}

export const setConfig = (config: Record<string, unknown>): void => {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
}
export const updateConfig = (_config: Record<string, unknown>): void => {
  setConfig({ ...getConfig(), ..._config })
}
