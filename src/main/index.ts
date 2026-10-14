import { app, shell, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/branding/fatebound/fatebound-app-icon.png?asset'
import { initializePortableStorage } from './storage/electron-storage-startup.ts'
import {
  activateStoragePaths,
  hasActiveStoragePaths,
  resolveWorldPackageInboxDirectory
} from './storage/portable-storage.ts'
import {
  closeActiveSqliteDatabase,
  hasOpenActiveSqliteDatabase,
  openActiveSqliteDatabase,
  restoreActiveSqliteBackup
} from './storage/sqlite-storage.ts'
import { readStorageDiagnostics } from './storage/storage-diagnostics.ts'
import { registerStorageDiagnosticsIpc } from './storage/storage-diagnostics-ipc.ts'
import { registerManualSqliteExportIpc } from './storage/sqlite-manual-export-ipc.ts'
import { exportManualSqliteBackup } from './storage/sqlite-manual-export.ts'
import { registerSqliteRestoreIpc } from './storage/sqlite-safe-restore-ipc.ts'
import {
  inspectRestorableSqliteBackup,
  recoverInterruptedSqliteRestore
} from './storage/sqlite-safe-restore.ts'
import { acquireSingleInstanceLock } from './single-instance.ts'
import { registerApplicationPreferencesIpc } from './preferences/application-preferences-ipc.ts'
import { readActiveApplicationLanguage } from './preferences/application-preferences.ts'
import {
  DEFAULT_APPLICATION_LANGUAGE,
  type ApplicationLanguage
} from '../shared/application-language.ts'
import { translate, type MessageKey } from '../shared/i18n/index.ts'
import { readWorldPackageCatalog } from './worlds/world-package-catalog.ts'
import { registerWorldPackageCatalogIpc } from './worlds/world-package-catalog-ipc.ts'

let mainWindow: BrowserWindow | null = null
let shutdownStarted = false
let shutdownComplete = false
let automaticBackupWarningVisible = false
let mainApplicationLanguage: ApplicationLanguage = DEFAULT_APPLICATION_LANGUAGE
const PORTABLE_SQLITE_VERIFICATION_ARGUMENT = '--verify-portable-sqlite'

function mainT(key: MessageKey): string {
  return translate(mainApplicationLanguage, key)
}

function getWorldPackageInboxDirectory(): string {
  return resolveWorldPackageInboxDirectory({
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    executablePath: process.execPath,
    portableExecutableDirectory: process.env['PORTABLE_EXECUTABLE_DIR']
  })
}

async function selectManualSqliteExportDestination(): Promise<string | undefined> {
  const options: OpenDialogOptions = {
    title: mainT('native.export.chooseTitle'),
    buttonLabel: mainT('native.export.chooseButton'),
    properties: ['openDirectory', 'createDirectory', 'promptToCreate', 'dontAddToRecent']
  }
  const result =
    mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options)

  return result.canceled || result.filePaths.length !== 1 ? undefined : result.filePaths[0]
}

async function selectSqliteRestoreSource(): Promise<string | undefined> {
  const options: OpenDialogOptions = {
    title: mainT('native.restore.chooseTitle'),
    buttonLabel: mainT('native.restore.chooseButton'),
    properties: ['openDirectory', 'dontAddToRecent']
  }
  const result =
    mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options)

  return result.canceled || result.filePaths.length !== 1 ? undefined : result.filePaths[0]
}

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
  const recovery = await recoverInterruptedSqliteRestore(storageResult.paths)
  if (recovery !== 'none') {
    console.warn(`Recovered interrupted Fatebound SQLite restore: ${recovery}`)
  }
  const languageResult = await readActiveApplicationLanguage()
  mainApplicationLanguage = languageResult.language
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
          title: mainT('native.backup.title'),
          message: mainT('native.backup.message'),
          detail: mainT('native.backup.detail'),
          buttons: [mainT('native.common.accept')]
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
  registerApplicationPreferencesIpc(
    (channel, handler) => ipcMain.handle(channel, (_event, ...args: unknown[]) => handler(...args)),
    {
      onLanguageSelected(language) {
        mainApplicationLanguage = language
      },
      onError(error) {
        console.error('Unable to read or write Fatebound preferences', error)
      }
    }
  )

  registerStorageDiagnosticsIpc(
    (channel, handler) => ipcMain.handle(channel, handler),
    readStorageDiagnostics,
    (error) => console.error('Unable to read Fatebound storage diagnostics', error)
  )

  registerManualSqliteExportIpc(
    (channel, handler) => ipcMain.handle(channel, () => handler()),
    selectManualSqliteExportDestination,
    exportManualSqliteBackup,
    (error) => console.error('Unable to export a manual Fatebound SQLite backup', error)
  )

  registerSqliteRestoreIpc(
    (channel, handler) => ipcMain.handle(channel, () => handler()),
    selectSqliteRestoreSource,
    inspectRestorableSqliteBackup,
    restoreActiveSqliteBackup,
    (error) => console.error('Unable to restore a Fatebound SQLite backup safely', error)
  )

  registerWorldPackageCatalogIpc(
    (channel, handler) => ipcMain.handle(channel, () => handler()),
    () => readWorldPackageCatalog(getWorldPackageInboxDirectory()),
    (error) => console.error('Unable to read the Fatebound world package catalog', error)
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

      dialog.showErrorBox(mainT('native.database.title'), mainT('native.database.detail'))
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
