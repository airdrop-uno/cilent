import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import ping from 'ping'
import icon from '../../resources/icon.png?asset'
import { createWallet } from './wallet'
import { mintFaucet } from './utils/monad'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import moment from 'moment'
import { registerListeners } from './actions'
import { updateConfig } from './utils/config'

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('monad', process.execPath, [resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('monad')
}
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', async (_event, url) => {
    console.log('ping', url)
    const { inputHost } = await ping.promise.probe(url)
    _event.reply('ping-result', inputHost && inputHost !== 'unknown')
  })
  ipcMain.on(
    'mint-monad-faucet',
    async (_event, { amount, recaptchaToken, executablePath, selectFolder }) => {
      console.log(amount, recaptchaToken, selectFolder)
      // 创建文件夹
      const now = moment().format('YYYY-MM-DD HH:mm:ss')
      const folder = join(selectFolder, `monad-${now}`)
      if (!existsSync(folder)) {
        mkdirSync(folder, { recursive: true })
      }
      const snapshotFolder = join(folder, `snapshot-${now}`)
      if (!existsSync(snapshotFolder)) {
        mkdirSync(snapshotFolder, { recursive: true })
      }
      // 创建钱包
      const wallets = createWallet(amount)
      // 领取代币
      for (const wallet of wallets) {
        console.log('mint', wallet)
        _event.reply('mint-monad-faucet-progress', {
          wallet,
          progress: 0
        })
        await mintFaucet(wallet, recaptchaToken, executablePath, snapshotFolder)
        _event.reply('mint-monad-faucet-progress', {
          wallet,
          progress: 100
        })
      }

      // 创建钱包文件
      const walletsFile = join(folder, 'wallets.json')
      writeFileSync(walletsFile, JSON.stringify(wallets, null, 2))

      // 返回结果
      _event.reply('mint-monad-faucet-result', {
        wallets,
        folder,
        snapshotFolder
      })
    }
  )
  ipcMain.on('select-path', (_event) => {
    dialog
      .showOpenDialog({
        properties: ['openDirectory']
      })
      .then((result) => {
        console.log(result)
        _event.reply('select-path-result', result)
      })
  })
  ipcMain.on('open-folder', (_event, folder) => {
    shell.openPath(folder)
  })
  registerListeners()
  const mainWindow = createWindow()
  const lock = app.requestSingleInstanceLock()
  if (!lock) {
    app.quit()
  } else {
    app.on('second-instance', (_event, commandLine) => {
      console.log('second-instance', commandLine)
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()

        // 获取协议 URL
        const url = commandLine.find((arg) => arg.startsWith('zebot://'))
        console.log('commandLine', commandLine)
        if (url) {
          mainWindow.webContents.send('browser-return', url)
        }
      }
    })
    app.on('open-url', (event, url) => {
      event.preventDefault()
      const params = new URLSearchParams(url.split('?')[1])
      const address = params.get('address')
      const timestamp = params.get('timestamp')
      const callback = params.get('callback')
      if (moment(timestamp).isBefore(moment().subtract(2, 'minutes'))) {
        return
      } else {
        updateConfig({ address })
        if (mainWindow) {
          mainWindow.webContents.send('browser-return', callback)
        }
      }
    })
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
