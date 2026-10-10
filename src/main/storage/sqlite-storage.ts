import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DatabaseSync, type DatabaseSyncOptions } from 'node:sqlite'
import { getActiveStoragePaths } from './portable-storage.ts'
import { createSqliteBackup, type CreateSqliteBackupOptions } from './sqlite-backup.ts'
import { validateSqliteDatabase } from './sqlite-integrity.ts'
import {
  applySqliteMigrations,
  getSqliteMigrationPlan,
  SQLITE_MIGRATIONS,
  type SqliteMigration
} from './sqlite-migrations.ts'

const SQLITE_BUSY_TIMEOUT_MS = 5_000

let activeDatabase: DatabaseSync | undefined
let activeDatabaseOpening = false

const DATABASE_OPTIONS: DatabaseSyncOptions = {
  allowExtension: false,
  enableDoubleQuotedStringLiterals: false,
  enableForeignKeyConstraints: true,
  timeout: SQLITE_BUSY_TIMEOUT_MS,
  allowBareNamedParameters: false,
  allowUnknownNamedParameters: false
}

export interface SqliteDatabaseStartupOptions {
  readonly migrations?: readonly SqliteMigration[]
  readonly createMigrationBackup?: typeof createSqliteBackup
}

interface JournalModeRow {
  readonly journal_mode: string
}

export function configurePortableDatabase(database: DatabaseSync): void {
  const journalMode = database.prepare('PRAGMA journal_mode = DELETE').get() as
    JournalModeRow | undefined

  if (journalMode?.journal_mode.toLowerCase() !== 'delete') {
    throw new Error(`SQLite refused journal_mode=DELETE (received ${journalMode?.journal_mode})`)
  }

  database.exec(`
    PRAGMA synchronous = EXTRA;
    PRAGMA temp_store = MEMORY;
    PRAGMA trusted_schema = OFF;
  `)
}

export function openSqliteConnection(databaseFile: string): DatabaseSync {
  return new DatabaseSync(resolve(databaseFile), DATABASE_OPTIONS)
}

async function databaseFileExists(databaseFile: string): Promise<boolean> {
  try {
    await stat(databaseFile)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

function migrationBackupOptions(schemaVersion: number): CreateSqliteBackupOptions {
  return {
    reason: 'pre-migration',
    schemaVersion
  }
}

export async function openSqliteDatabase(
  databaseFile: string,
  backupsDirectory: string,
  options: SqliteDatabaseStartupOptions = {}
): Promise<DatabaseSync> {
  const resolvedDatabaseFile = resolve(databaseFile)
  const resolvedBackupsDirectory = resolve(backupsDirectory)
  const migrations = options.migrations ?? SQLITE_MIGRATIONS
  const createMigrationBackup = options.createMigrationBackup ?? createSqliteBackup
  const existedBeforeStartup = await databaseFileExists(resolvedDatabaseFile)
  let database: DatabaseSync | undefined

  try {
    database = openSqliteConnection(resolvedDatabaseFile)
    configurePortableDatabase(database)

    if (existedBeforeStartup) {
      validateSqliteDatabase(database, 'quick')
    }

    const migrationPlan = getSqliteMigrationPlan(database, migrations)

    if (existedBeforeStartup && migrationPlan.pendingMigrations.length > 0) {
      validateSqliteDatabase(database, 'full')
      await createMigrationBackup(
        database,
        resolvedBackupsDirectory,
        migrationBackupOptions(migrationPlan.currentVersion)
      )
    }

    if (migrationPlan.pendingMigrations.length > 0) {
      applySqliteMigrations(database, migrations)
      validateSqliteDatabase(database, 'full')
    }

    return database
  } catch (error) {
    if (database?.isOpen) database.close()

    throw new Error(
      `Could not safely initialize the Fatebound SQLite database at ${resolvedDatabaseFile}`,
      { cause: error }
    )
  }
}

export async function openActiveSqliteDatabase(): Promise<DatabaseSync> {
  if (activeDatabase?.isOpen || activeDatabaseOpening) {
    throw new Error('The Fatebound SQLite database is already open')
  }

  activeDatabaseOpening = true

  try {
    const paths = getActiveStoragePaths()
    const database = await openSqliteDatabase(paths.databaseFile, paths.backupsDirectory)
    activeDatabase = database
    return database
  } finally {
    activeDatabaseOpening = false
  }
}

export function hasOpenActiveSqliteDatabase(): boolean {
  return activeDatabase?.isOpen === true
}

export function closeActiveSqliteDatabase(): void {
  const database = activeDatabase
  activeDatabase = undefined

  if (database?.isOpen) database.close()
}
