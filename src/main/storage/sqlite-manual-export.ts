import { realpath, rm, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import {
  formatBackupDirectoryTimestamp,
  type SqliteBackupResult
} from './sqlite-backup.ts'
import {
  inspectManagedSqliteBackup,
  type SqliteBackupCatalogEntry
} from './sqlite-backup-retention.ts'
import { getActiveStoragePaths, type StoragePaths } from './portable-storage.ts'
import { createActiveManualSqliteBackup } from './sqlite-storage.ts'

export class ManualSqliteExportDestinationError extends Error {
  readonly code: 'destination-not-allowed' | 'destination-unavailable'

  constructor(
    code: 'destination-not-allowed' | 'destination-unavailable',
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'ManualSqliteExportDestinationError'
    this.code = code
  }
}

export interface ManualSqliteExportOptions {
  readonly storagePaths?: StoragePaths
  readonly createBackup?: (
    destinationDirectory: string,
    verifyPublishedBackup: (result: SqliteBackupResult) => Promise<void>
  ) => Promise<SqliteBackupResult>
  readonly inspectBackup?: (
    backupDirectory: string
  ) => Promise<SqliteBackupCatalogEntry | undefined>
  readonly removeDirectory?: (directory: string) => Promise<void>
}

function isSameOrDescendant(candidate: string, root: string): boolean {
  const relativePath = relative(root, candidate)
  return (
    relativePath === '' ||
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`) &&
      !isAbsolute(relativePath))
  )
}

async function resolveExistingDirectory(directory: string): Promise<string> {
  if (directory.trim() === '') {
    throw new ManualSqliteExportDestinationError(
      'destination-unavailable',
      'The selected SQLite export destination is empty'
    )
  }

  const canonicalDirectory = await realpath(resolve(directory))
  if (!(await stat(canonicalDirectory)).isDirectory()) {
    throw new ManualSqliteExportDestinationError(
      'destination-unavailable',
      'The selected SQLite export destination is not a directory'
    )
  }
  return canonicalDirectory
}

async function resolveActiveBackupsDirectory(paths: StoragePaths): Promise<string> {
  try {
    return await realpath(resolve(paths.backupsDirectory))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error

    const dataDirectory = resolve(paths.dataDirectory)
    const backupsDirectory = resolve(paths.backupsDirectory)
    const relativeBackupsDirectory = relative(dataDirectory, backupsDirectory)
    return resolve(await realpath(dataDirectory), relativeBackupsDirectory)
  }
}

export async function resolveManualSqliteExportDestination(
  destinationDirectory: string,
  storagePaths: StoragePaths = getActiveStoragePaths()
): Promise<string> {
  try {
    const [destination, activeDataDirectory, activeBackupsDirectory] = await Promise.all([
      resolveExistingDirectory(destinationDirectory),
      realpath(resolve(storagePaths.dataDirectory)),
      resolveActiveBackupsDirectory(storagePaths)
    ])

    if (
      isSameOrDescendant(destination, activeDataDirectory) ||
      isSameOrDescendant(destination, activeBackupsDirectory)
    ) {
      throw new ManualSqliteExportDestinationError(
        'destination-not-allowed',
        'SQLite backups cannot be exported inside active Fatebound storage'
      )
    }

    return destination
  } catch (error) {
    if (error instanceof ManualSqliteExportDestinationError) throw error
    throw new ManualSqliteExportDestinationError(
      'destination-unavailable',
      'The selected SQLite export destination could not be validated safely',
      { cause: error }
    )
  }
}

function expectedBackupDirectoryName(result: SqliteBackupResult): string {
  return `backup-${formatBackupDirectoryTimestamp(result.manifest.createdAt)}-${result.manifest.reason}-${result.manifest.id}`
}

function assertOwnedManualExport(
  result: SqliteBackupResult,
  destinationDirectory: string
): string {
  const resolvedDestination = resolve(destinationDirectory)
  const resolvedBackupDirectory = resolve(result.directory)

  if (
    result.manifest.reason !== 'manual' ||
    dirname(resolvedBackupDirectory) !== resolvedDestination ||
    basename(resolvedBackupDirectory) !== expectedBackupDirectoryName(result) ||
    resolve(result.databaseFile) !== join(resolvedBackupDirectory, 'fatebound.sqlite') ||
    resolve(result.manifestFile) !== join(resolvedBackupDirectory, 'manifest.json')
  ) {
    throw new Error('Refusing to clean an unrecognized manual SQLite export path')
  }

  return resolvedBackupDirectory
}

async function removeDirectory(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: false })
}

export async function exportManualSqliteBackup(
  destinationDirectory: string,
  options: ManualSqliteExportOptions = {}
): Promise<SqliteBackupResult> {
  const safeDestination = await resolveManualSqliteExportDestination(
    destinationDirectory,
    options.storagePaths
  )
  const createBackup = options.createBackup ?? createActiveManualSqliteBackup
  const inspectBackup = options.inspectBackup ?? inspectManagedSqliteBackup
  const cleanupDirectory = options.removeDirectory ?? removeDirectory
  return createBackup(safeDestination, async (result) => {
    const verified = await inspectBackup(result.directory)
    if (verified) return

    const ownedDirectory = assertOwnedManualExport(result, safeDestination)
    const validationError = new Error(
      'The published manual SQLite export did not pass manifest, size, SHA-256, and integrity validation'
    )

    try {
      await cleanupDirectory(ownedDirectory)
    } catch (cleanupError) {
      throw new AggregateError(
        [validationError, cleanupError],
        'The invalid manual SQLite export could not be cleaned safely'
      )
    }

    throw validationError
  })
}
