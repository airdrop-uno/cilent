import axios from 'axios'
import { app, dialog, shell } from 'electron'
import semver from 'semver'

export const checkUpdate = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'development') return
  const currentVersion = app.getVersion()
  const res = await axios.get('https://airdrop.uno/api/client/releases')
  const files = res.data
  const versions = files
    .map((file) => file.name)
    .filter((name) => name.startsWith('v'))
    .sort((a, b) => semver.compare(b, a))
  if (versions.length === 0) return
  const latestVersion = versions[0]
  if (semver.gt(latestVersion, currentVersion)) {
    // 获取对应平台的下载URL
    const platform = process.platform
    const extension = platform === 'darwin' ? 'dmg' : 'exe'
    const publicUrl = `https://yrymieztfhbrhumjknsm.supabase.co/storage/v1/object/public/client-releases/${latestVersion}/airdrop.uno-${latestVersion}.${extension}`
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${latestVersion}，是否更新？`,
      buttons: ['是', '否']
    })

    if (response === 0) {
      // 在默认浏览器中打开下载链接
      shell.openExternal(publicUrl)
    }
  }
}
