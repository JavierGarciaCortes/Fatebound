import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DatabaseSync, type DatabaseSyncOptions } from 'node:sqlite'
import { getActiveStoragePaths } from './portable-storage.ts'
import {
  AutomaticSqliteBackupCoordinator,
  loadAutomaticBackupState,
  saveAutomaticBackupState
} from './sqlite-automatic-backup.ts'
import { createSqliteBackup, type CreateSqliteBackupOptions } from './sqlite-backup.ts'
import { enforceSqliteBackupRetention } from './sqlite-backup-retention.ts'
import { validateSqliteDatabase } from './sqlite-integrity.ts'
import {
  applySqliteMigrations,
  getSqliteMigrationPlan,
  SQLITE_MIGRATIONS,
  type SqliteMigration
} from './sqlite-migrations.ts'
import { SqliteOperationQueue } from './sqlite-operation-queue.ts'

const SQLITE_BUSY_TIMEOUT_MS = 5_000

interface ActiveSqliteRuntime {
  readonly database: DatabaseSync
  readonly operations: SqliteOperationQueue
  readonly automaticBackups: AutomaticSqliteBackupCoordinator
}

let activeRuntime: ActiveSqliteRuntime | undefined
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
  readonly enforceBackupRetention?: typeof enforceSqliteBackupRetention
  readonly onBackupMaintenanceError?: (error: unknown) => void
}

export interface ActiveSqliteDatabaseOptions {
  readonly onAutomaticBackupError?: (error: unknown) => void
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
  const enforceBackupRetention = options.enforceBackupRetention ?? enforceSqliteBackupRetention
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

      try {
        await enforceBackupRetention(resolvedBackupsDirectory)
      } catch (error) {
        options.onBackupMaintenanceError?.(error)
      }
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

export async function openActiveSqliteDatabase(
  options: ActiveSqliteDatabaseOptions = {}
): Promise<void> {
  if (activeRuntime?.database.isOpen || activeDatabaseOpening) {
    throw new Error('The Fatebound SQLite database is already open')
  }

  activeDatabaseOpening = true
  let openedDatabase: DatabaseSync | undefined

  try {
    const paths = getActiveStoragePaths()
    const reportAutomaticBackupError = options.onAutomaticBackupError ?? (() => undefined)
    const database = await openSqliteDatabase(paths.databaseFile, paths.backupsDirectory, {
      onBackupMaintenanceError: reportAutomaticBackupError
    })
    openedDatabase = database
    const operations = new SqliteOperationQueue()
    const initialBackupState = await loadAutomaticBackupState(
      paths.backupsDirectory,
      reportAutomaticBackupError
    )
    const automaticBackups = new AutomaticSqliteBackupCoordinator({
      initialState: initialBackupState,
      onError: reportAutomaticBackupError,
      persistState: (state) => saveAutomaticBackupState(paths.backupsDirectory, state),
      createBackup: () =>
        operations.run(async () => {
          if (!database.isOpen) {
            throw new Error('SQLite is not available for an automatic backup')
          }

          const schemaVersion = getSqliteMigrationPlan(database).currentVersion
          const result = await createSqliteBackup(database, paths.backupsDirectory, {
            reason: 'automatic',
            schemaVersion
          })

          try {
            await enforceSqliteBackupRetention(paths.backupsDirectory)
          } catch (error) {
            reportAutomaticBackupError(error)
          }

          return result
        })
    })

    activeRuntime = { database, operations, automaticBackups }
    automaticBackups.start()
  } catch (error) {
    if (activeRuntime?.database.isOpen) activeRuntime.database.close()
    if (openedDatabase?.isOpen) openedDatabase.close()
    activeRuntime = undefined
    throw error
  } finally {
    activeDatabaseOpening = false
  }
}

export function hasOpenActiveSqliteDatabase(): boolean {
  return activeRuntime?.database.isOpen === true
}

interface TotalChangesRow {
  readonly count: number
}

function readTotalChanges(database: DatabaseSync): number {
  return (database.prepare('SELECT total_changes() AS count').get() as unknown as TotalChangesRow)
    .count
}

export async function runSqliteWriteTransaction<T>(
  database: DatabaseSync,
  operation: (database: DatabaseSync) => T,
  onCommittedChange: () => void | Promise<void>
): Promise<T> {
  const totalChangesBefore = readTotalChanges(database)
  database.exec('BEGIN IMMEDIATE')

  try {
    const result = operation(database)
    if (result instanceof Promise) {
      throw new Error('SQLite write transactions must not contain asynchronous work')
    }
    if (!database.isTransaction) {
      throw new Error('SQLite write operations must not commit or roll back their own transaction')
    }

    const changed = readTotalChanges(database) > totalChangesBefore
    database.exec('COMMIT')
    if (changed) await onCommittedChange()
    return result
  } catch (error) {
    if (database.isTransaction) database.exec('ROLLBACK')
    throw error
  }
}

export async function runActiveSqliteWriteTransaction<T>(
  operation: (database: DatabaseSync) => T
): Promise<T> {
  const runtime = activeRuntime
  if (!runtime?.database.isOpen) {
    throw new Error('The Fatebound SQLite database is not available')
  }

  return runtime.operations.run(() =>
    runSqliteWriteTransaction(runtime.database, operation, () =>
      runtime.automaticBackups.recordCommittedChange()
    )
  )
}

export async function closeActiveSqliteDatabase(): Promise<void> {
  const runtime = activeRuntime
  activeRuntime = undefined

  if (!runtime) return

  const backupShutdown = runtime.automaticBackups.stop()
  runtime.operations.stopAccepting()
  await backupShutdown
  await runtime.operations.waitForIdle()

  if (runtime.database.isOpen) runtime.database.close()
}
