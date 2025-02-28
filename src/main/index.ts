import { app, shell, BrowserWindow } from 'electron'
// import * as logger from 'electron-log/main'
import { join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import moment from 'moment'
import { registerListeners } from './actions'

// logger.initialize({ preload: true })
function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.mjs'),
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('monad', process.execPath, [
      resolve(process.argv[1])
    ])
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
      const timestamp = params.get('timestamp')
      const callback = params.get('callback')
      if (moment(timestamp).isBefore(moment().subtract(2, 'minutes'))) {
        return
      } else {
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
