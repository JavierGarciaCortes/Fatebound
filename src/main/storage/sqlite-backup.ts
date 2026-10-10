import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { backup, DatabaseSync, type DatabaseSyncOptions } from 'node:sqlite'
import { validateSqliteDatabase } from './sqlite-integrity.ts'

const BACKUP_DATABASE_FILE = 'fatebound.sqlite'
const BACKUP_MANIFEST_FILE = 'manifest.json'
const BACKUP_FORMAT_VERSION = 1

const READ_ONLY_DATABASE_OPTIONS: DatabaseSyncOptions = {
  allowExtension: false,
  enableDoubleQuotedStringLiterals: false,
  enableForeignKeyConstraints: true,
  readOnly: true,
  allowBareNamedParameters: false,
  allowUnknownNamedParameters: false
}

export type SqliteBackupReason = 'pre-migration' | 'automatic' | 'manual'

export interface SqliteBackupManifest {
  readonly formatVersion: 1
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
}

function formatDirectoryTimestamp(createdAt: string): string {
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

    await rm(temporaryDirectory, { recursive: true, force: true })
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

  assertSafeBackupId(id)
  await mkdir(resolvedBackupsDirectory, { recursive: true })
  await cleanupSqliteBackupTemporaryDirectories(resolvedBackupsDirectory)

  const temporaryDirectory = await mkdtemp(join(resolvedBackupsDirectory, '.partial-'))
  const temporaryDatabaseFile = join(temporaryDirectory, BACKUP_DATABASE_FILE)
  const temporaryManifestFile = join(temporaryDirectory, BACKUP_MANIFEST_FILE)
  const finalDirectory = join(
    resolvedBackupsDirectory,
    `backup-${formatDirectoryTimestamp(createdAt)}-${options.reason}-${id}`
  )

  try {
    await backupDatabase(sourceDatabase, temporaryDatabaseFile)
    verifyDatabase(temporaryDatabaseFile)

    const databaseStats = await stat(temporaryDatabaseFile)
    const manifest: SqliteBackupManifest = Object.freeze({
      formatVersion: BACKUP_FORMAT_VERSION,
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
    await rename(temporaryDirectory, finalDirectory)

    return {
      directory: finalDirectory,
      databaseFile: join(finalDirectory, BACKUP_DATABASE_FILE),
      manifestFile: join(finalDirectory, BACKUP_MANIFEST_FILE),
      manifest
    }
  } catch (error) {
    try {
      await rm(temporaryDirectory, { recursive: true, force: true })
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'SQLite backup failed and its temporary files could not be cleaned safely'
      )
    }

    throw new Error('Could not create a verified Fatebound SQLite backup', { cause: error })
  }
}
