import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  statfs,
  unlink,
  writeFile
} from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { backup, DatabaseSync, type DatabaseSyncOptions } from 'node:sqlite'
import { validateSqliteDatabase } from './sqlite-integrity.ts'

const BACKUP_DATABASE_FILE = 'fatebound.sqlite'
const BACKUP_MANIFEST_FILE = 'manifest.json'
const BACKUP_STAGING_MARKER = '.fatebound-backup-staging'
const BACKUP_FORMAT_VERSION = 2
const BACKUP_APPLICATION = 'fatebound'

const READ_ONLY_DATABASE_OPTIONS: DatabaseSyncOptions = {
  allowExtension: false,
  enableDoubleQuotedStringLiterals: false,
  enableForeignKeyConstraints: true,
  readOnly: true,
  allowBareNamedParameters: false,
  allowUnknownNamedParameters: false
}

export type SqliteBackupReason = 'pre-migration' | 'protected' | 'automatic' | 'manual'

export interface SqliteBackupManifest {
  readonly formatVersion: 2
  readonly application: typeof BACKUP_APPLICATION
  readonly id: string
  readonly createdAt: string
  readonly reason: SqliteBackupReason
  readonly schemaVersion: number
  readonly databaseFile: typeof BACKUP_DATABASE_FILE
  readonly sizeBytes: number
  readonly sha256: string
}

export interface SqliteBackupResult {
  readonly directory: string
  readonly databaseFile: string
  readonly manifestFile: string
  readonly manifest: SqliteBackupManifest
}

export type SqliteBackupFunction = (
  sourceDatabase: DatabaseSync,
  destinationFile: string
) => Promise<number>

export interface CreateSqliteBackupOptions {
  readonly reason: SqliteBackupReason
  readonly schemaVersion: number
  readonly idFactory?: () => string
  readonly now?: () => Date
  readonly backupDatabase?: SqliteBackupFunction
  readonly verifyDatabase?: (databaseFile: string) => void
  readonly getAvailableBytes?: (directory: string) => Promise<bigint | null>
}

export function formatBackupDirectoryTimestamp(createdAt: string): string {
  return createdAt.slice(0, 19).replaceAll('-', '').replaceAll(':', '') + 'Z'
}

function assertSafeBackupId(id: string): void {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    throw new Error('SQLite backup identifiers may contain only letters, numbers, and hyphens')
  }
}

export async function calculateFileSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')

  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk)
  }

  return hash.digest('hex')
}

export function verifySqliteBackupFile(databaseFile: string): void {
  const database = new DatabaseSync(resolve(databaseFile), READ_ONLY_DATABASE_OPTIONS)

  try {
    database.exec(`
      PRAGMA query_only = ON;
      PRAGMA temp_store = MEMORY;
      PRAGMA trusted_schema = OFF;
    `)
    validateSqliteDatabase(database, 'full')
  } finally {
    database.close()
  }
}

export async function cleanupSqliteBackupTemporaryDirectories(
  backupsDirectory: string
): Promise<void> {
  const resolvedBackupsDirectory = resolve(backupsDirectory)
  let entries

  try {
    entries = await readdir(resolvedBackupsDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('.partial-')) continue

    const temporaryDirectory = resolve(resolvedBackupsDirectory, entry.name)

    if (dirname(temporaryDirectory) !== resolvedBackupsDirectory) {
      throw new Error('Refusing to clean a SQLite backup path outside the backup directory')
    }

    try {
      const marker = await readFile(join(temporaryDirectory, BACKUP_STAGING_MARKER), 'utf8')
      if (marker !== `${BACKUP_APPLICATION}\n`) continue
    } catch {
      continue
    }

    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

async function getFilesystemAvailableBytes(directory: string): Promise<bigint | null> {
  try {
    const filesystem = await statfs(directory, { bigint: true })
    return filesystem.bavail * filesystem.bsize
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOSYS' || code === 'ENOTSUP') return null
    throw error
  }
}

async function assertEnoughSpaceForBackup(
  sourceDatabase: DatabaseSync,
  backupsDirectory: string,
  getAvailableBytes: (directory: string) => Promise<bigint | null>
): Promise<void> {
  const sourceFile = sourceDatabase.location()

  if (!sourceFile || sourceFile === ':memory:') {
    throw new Error('SQLite backups require a file-backed source database')
  }

  const [sourceStats, availableBytes] = await Promise.all([
    stat(sourceFile, { bigint: true }),
    getAvailableBytes(backupsDirectory)
  ])

  if (availableBytes !== null && availableBytes < sourceStats.size) {
    const error = new Error(
      `Not enough free space to create the SQLite backup (${availableBytes} available, ${sourceStats.size} required)`
    ) as NodeJS.ErrnoException
    error.code = 'ENOSPC'
    throw error
  }
}

async function runNodeSqliteBackup(
  sourceDatabase: DatabaseSync,
  destinationFile: string
): Promise<number> {
  return backup(sourceDatabase, destinationFile)
}

export async function createSqliteBackup(
  sourceDatabase: DatabaseSync,
  backupsDirectory: string,
  options: CreateSqliteBackupOptions
): Promise<SqliteBackupResult> {
  const resolvedBackupsDirectory = resolve(backupsDirectory)
  const id = (options.idFactory ?? randomUUID)()
  const createdAt = (options.now ?? (() => new Date()))().toISOString()
  const backupDatabase = options.backupDatabase ?? runNodeSqliteBackup
  const verifyDatabase = options.verifyDatabase ?? verifySqliteBackupFile
  const getAvailableBytes = options.getAvailableBytes ?? getFilesystemAvailableBytes

  assertSafeBackupId(id)
  let temporaryDirectory: string | undefined

  try {
    await mkdir(resolvedBackupsDirectory, { recursive: true })
    await cleanupSqliteBackupTemporaryDirectories(resolvedBackupsDirectory)
    await assertEnoughSpaceForBackup(sourceDatabase, resolvedBackupsDirectory, getAvailableBytes)

    temporaryDirectory = await mkdtemp(join(resolvedBackupsDirectory, '.partial-'))
    const temporaryDatabaseFile = join(temporaryDirectory, BACKUP_DATABASE_FILE)
    const temporaryManifestFile = join(temporaryDirectory, BACKUP_MANIFEST_FILE)
    const temporaryStagingMarker = join(temporaryDirectory, BACKUP_STAGING_MARKER)
    const finalDirectory = join(
      resolvedBackupsDirectory,
      `backup-${formatBackupDirectoryTimestamp(createdAt)}-${options.reason}-${id}`
    )

    await writeFile(temporaryStagingMarker, `${BACKUP_APPLICATION}\n`, {
      encoding: 'utf8',
      flag: 'wx'
    })
    await backupDatabase(sourceDatabase, temporaryDatabaseFile)
    verifyDatabase(temporaryDatabaseFile)

    const databaseStats = await stat(temporaryDatabaseFile)
    const manifest: SqliteBackupManifest = Object.freeze({
      formatVersion: BACKUP_FORMAT_VERSION,
      application: BACKUP_APPLICATION,
      id,
      createdAt,
      reason: options.reason,
      schemaVersion: options.schemaVersion,
      databaseFile: BACKUP_DATABASE_FILE,
      sizeBytes: databaseStats.size,
      sha256: await calculateFileSha256(temporaryDatabaseFile)
    })

    await writeFile(temporaryManifestFile, `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx'
    })
    await unlink(temporaryStagingMarker)
    await rename(temporaryDirectory, finalDirectory)

    return {
      directory: finalDirectory,
      databaseFile: join(finalDirectory, BACKUP_DATABASE_FILE),
      manifestFile: join(finalDirectory, BACKUP_MANIFEST_FILE),
      manifest
    }
  } catch (error) {
    try {
      if (temporaryDirectory) {
        await rm(temporaryDirectory, { recursive: true, force: true })
      }
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'SQLite backup failed and its temporary files could not be cleaned safely'
      )
    }

    throw new Error('Could not create a verified Fatebound SQLite backup', { cause: error })
  }
}
