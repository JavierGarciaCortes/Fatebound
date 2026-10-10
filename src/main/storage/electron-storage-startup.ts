import { app, dialog } from 'electron'
import {
  probeStorageWriteAccess,
  resolveDefaultStoragePaths,
  type StoragePaths
} from './portable-storage.ts'
import {
  prepareStorageForStartup,
  type StorageFailureAction,
  type StorageStartupResult
} from './storage-startup.ts'

const FAILURE_ACTIONS: readonly StorageFailureAction[] = ['retry', 'choose-directory', 'exit']

function getDefaultStoragePaths(): StoragePaths {
  return resolveDefaultStoragePaths({
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    executablePath: process.execPath,
    portableExecutableDirectory: process.env['PORTABLE_EXECUTABLE_DIR']
  })
}

async function requestFailureAction(directory: string): Promise<StorageFailureAction> {
  const result = await dialog.showMessageBox({
    type: 'error',
    title: 'Fatebound',
    message: 'Fatebound no puede escribir en la carpeta de datos.',
    detail: `${directory}\n\nPuedes volver a comprobarla, elegir otra carpeta para esta sesión o salir. Fatebound no cambiará de ubicación ni moverá datos automáticamente.`,
    buttons: ['Reintentar', 'Elegir otra carpeta', 'Salir'],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  })

  return FAILURE_ACTIONS[result.response] ?? 'exit'
}

async function chooseAlternativeDirectory(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Elegir carpeta de datos de Fatebound',
    buttonLabel: 'Usar esta carpeta',
    properties: ['openDirectory', 'createDirectory', 'dontAddToRecent']
  })

  return result.canceled ? null : (result.filePaths[0] ?? null)
}

export async function initializePortableStorage(): Promise<StorageStartupResult> {
  return prepareStorageForStartup(getDefaultStoragePaths(), {
    probeWriteAccess: probeStorageWriteAccess,
    requestFailureAction,
    chooseAlternativeDirectory
  })
}
