import { randomUUID } from 'node:crypto'
import { open, readFile, rename, rm } from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import { join } from 'node:path'
import {
  DEFAULT_APPLICATION_LANGUAGE,
  isApplicationLanguage,
  type ApplicationLanguage,
  type ApplicationLanguageReadResult
} from '../../shared/application-language.ts'
import { getActiveStoragePaths } from '../storage/portable-storage.ts'

const PREFERENCES_FILE_NAME = 'preferences.json'
const PREFERENCES_SCHEMA_VERSION = 1

interface StoredPreferences {
  readonly schemaVersion: typeof PREFERENCES_SCHEMA_VERSION
  readonly applicationLanguage: ApplicationLanguage
}

function preferencesFile(dataDirectory: string): string {
  return join(dataDirectory, PREFERENCES_FILE_NAME)
}

function parseStoredPreferences(source: string): StoredPreferences | null {
  try {
    const value = JSON.parse(source) as unknown
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const record = value as Record<string, unknown>
    if (
      Object.keys(record).length !== 2 ||
      record.schemaVersion !== PREFERENCES_SCHEMA_VERSION ||
      !isApplicationLanguage(record.applicationLanguage)
    ) {
      return null
    }
    return {
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      applicationLanguage: record.applicationLanguage
    }
  } catch {
    return null
  }
}

export async function readApplicationLanguageFromDirectory(
  dataDirectory: string
): Promise<ApplicationLanguageReadResult> {
  try {
    const source = await readFile(preferencesFile(dataDirectory), 'utf8')
    const preferences = parseStoredPreferences(source)
    return preferences
      ? { status: 'ready', language: preferences.applicationLanguage, source: 'stored' }
      : {
          status: 'ready',
          language: DEFAULT_APPLICATION_LANGUAGE,
          source: 'default-invalid'
        }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        status: 'ready',
        language: DEFAULT_APPLICATION_LANGUAGE,
        source: 'default-missing'
      }
    }
    return {
      status: 'error',
      language: DEFAULT_APPLICATION_LANGUAGE,
      code: 'preferences-unavailable'
    }
  }
}

export function readActiveApplicationLanguage(): Promise<ApplicationLanguageReadResult> {
  return readApplicationLanguageFromDirectory(getActiveStoragePaths().dataDirectory)
}

export async function writeApplicationLanguageToDirectory(
  dataDirectory: string,
  language: ApplicationLanguage,
  tokenFactory: () => string = randomUUID
): Promise<void> {
  const target = preferencesFile(dataDirectory)
  const temporary = join(dataDirectory, `.preferences-${tokenFactory()}.tmp`)
  const contents = `${JSON.stringify({
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    applicationLanguage: language
  } satisfies StoredPreferences, null, 2)}\n`
  let handle: FileHandle | undefined

  try {
    handle = await open(temporary, 'wx', 0o600)
    await handle.writeFile(contents, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporary, target)
  } catch (error) {
    await handle?.close().catch(() => undefined)
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  }
}

let writeQueue: Promise<void> = Promise.resolve()

export function writeActiveApplicationLanguage(language: ApplicationLanguage): Promise<void> {
  const operation = writeQueue.then(() =>
    writeApplicationLanguageToDirectory(getActiveStoragePaths().dataDirectory, language)
  )
  writeQueue = operation.catch(() => undefined)
  return operation
}
