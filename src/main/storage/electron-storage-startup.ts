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
import type { ApplicationLanguage } from '../../shared/application-language.ts'
import { translate } from '../../shared/i18n/index.ts'
import { readApplicationLanguageFromDirectory } from '../preferences/application-preferences.ts'

const FAILURE_ACTIONS: readonly StorageFailureAction[] = ['retry', 'choose-directory', 'exit']

function getDefaultStoragePaths(): StoragePaths {
  return resolveDefaultStoragePaths({
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    executablePath: process.execPath,
    portableExecutableDirectory: process.env['PORTABLE_EXECUTABLE_DIR']
  })
}

async function requestFailureAction(
  directory: string,
  language: ApplicationLanguage
): Promise<StorageFailureAction> {
  const result = await dialog.showMessageBox({
    type: 'error',
    title: 'Fatebound',
    message: translate(language, 'native.storage.writeError'),
    detail: translate(language, 'native.storage.writeErrorDetail', { directory }),
    buttons: [
      translate(language, 'native.storage.retry'),
      translate(language, 'native.storage.chooseDirectory'),
      translate(language, 'native.storage.exit')
    ],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  })

  return FAILURE_ACTIONS[result.response] ?? 'exit'
}

async function chooseAlternativeDirectory(language: ApplicationLanguage): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: translate(language, 'native.storage.chooseTitle'),
    buttonLabel: translate(language, 'native.storage.chooseButton'),
    properties: ['openDirectory', 'createDirectory', 'dontAddToRecent']
  })

  return result.canceled ? null : (result.filePaths[0] ?? null)
}

export async function initializePortableStorage(): Promise<StorageStartupResult> {
  const defaultPaths = getDefaultStoragePaths()
  const language = (await readApplicationLanguageFromDirectory(defaultPaths.dataDirectory)).language

  return prepareStorageForStartup(defaultPaths, {
    probeWriteAccess: probeStorageWriteAccess,
    requestFailureAction: (directory) => requestFailureAction(directory, language),
    chooseAlternativeDirectory: () => chooseAlternativeDirectory(language)
  })
}
