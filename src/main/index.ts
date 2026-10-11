import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/branding/fatebound/fatebound-app-icon.png?asset'
import { initializePortableStorage } from './storage/electron-storage-startup.ts'
import { activateStoragePaths, hasActiveStoragePaths } from './storage/portable-storage.ts'
import {
  closeActiveSqliteDatabase,
  hasOpenActiveSqliteDatabase,
  openActiveSqliteDatabase
} from './storage/sqlite-storage.ts'
import { readStorageDiagnostics } from './storage/storage-diagnostics.ts'
import { registerStorageDiagnosticsIpc } from './storage/storage-diagnostics-ipc.ts'
import { acquireSingleInstanceLock } from './single-instance.ts'

let mainWindow: BrowserWindow | null = null
let shutdownStarted = false
let shutdownComplete = false
let automaticBackupWarningVisible = false
const PORTABLE_SQLITE_VERIFICATION_ARGUMENT = '--verify-portable-sqlite'

function createWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }

  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 760,
    minHeight: 620,
    show: false,
    backgroundColor: '#090b11',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function startApplication(): Promise<void> {
  const storageResult = await initializePortableStorage()

  if (storageResult.status === 'exit') {
    app.quit()
    return
  }

  activateStoragePaths(storageResult.paths)
  await openActiveSqliteDatabase({
    onAutomaticBackupError(error) {
      console.error('Automatic SQLite backup maintenance failed', error)

      if (
        shutdownStarted ||
        automaticBackupWarningVisible ||
        process.argv.includes(PORTABLE_SQLITE_VERIFICATION_ARGUMENT)
      ) {
        return
      }

      automaticBackupWarningVisible = true
      void dialog
        .showMessageBox({
          type: 'warning',
          title: 'Copia de seguridad no completada',
          message: 'Fatebound no ha podido crear o mantener la copia automática de SQLite.',
          detail:
            'La base de datos principal y las copias anteriores no se han sustituido. Puedes seguir usando Fatebound, pero conviene revisar el espacio disponible y la unidad antes de continuar.',
          buttons: ['Entendido']
        })
        .finally(() => {
          automaticBackupWarningVisible = false
        })
    }
  })

  if (process.argv.includes(PORTABLE_SQLITE_VERIFICATION_ARGUMENT)) {
    await closeActiveSqliteDatabase()
    app.exit(0)
    return
  }

  createWindow()
}

function registerApplicationLifecycle(): void {
  registerStorageDiagnosticsIpc(
    (channel, handler) => ipcMain.handle(channel, handler),
    readStorageDiagnostics,
    (error) => console.error('Unable to read Fatebound storage diagnostics', error)
  )

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.fatebound.app')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    app.on('activate', function () {
      if (!hasActiveStoragePaths() || !hasOpenActiveSqliteDatabase()) return

      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    void startApplication().catch((error: unknown) => {
      console.error('Unable to initialize the Fatebound SQLite database', error)

      if (process.argv.includes(PORTABLE_SQLITE_VERIFICATION_ARGUMENT)) {
        app.exit(1)
        return
      }

      dialog.showErrorBox(
        'Fatebound no puede abrir sus datos',
        'La comprobación de integridad, la copia de seguridad o la migración de SQLite no se pudo completar. Fatebound se cerrará sin abrir la interfaz y no restaurará ni sustituirá automáticamente la base de datos.'
      )
      app.quit()
    })
  })

  app.on('before-quit', (event) => {
    if (shutdownComplete) return

    event.preventDefault()
    if (shutdownStarted) return
    shutdownStarted = true

    void closeActiveSqliteDatabase()
      .catch((error: unknown) => {
        console.error('Unable to close the Fatebound SQLite database safely', error)
      })
      .finally(() => {
        shutdownComplete = true
        app.quit()
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
}

if (acquireSingleInstanceLock(app)) {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  registerApplicationLifecycle()
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
