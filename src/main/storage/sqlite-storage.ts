import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { getActiveStoragePaths } from './portable-storage.ts'
import { applySqliteMigrations } from './sqlite-migrations.ts'

const SQLITE_BUSY_TIMEOUT_MS = 5_000

let activeDatabase: DatabaseSync | undefined

interface JournalModeRow {
  readonly journal_mode: string
}

function configurePortableDatabase(database: DatabaseSync): void {
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

export function openSqliteDatabase(databaseFile: string): DatabaseSync {
  const resolvedDatabaseFile = resolve(databaseFile)
  let database: DatabaseSync | undefined

  try {
    database = new DatabaseSync(resolvedDatabaseFile, {
      allowExtension: false,
      enableDoubleQuotedStringLiterals: false,
      enableForeignKeyConstraints: true,
      timeout: SQLITE_BUSY_TIMEOUT_MS,
      allowBareNamedParameters: false,
      allowUnknownNamedParameters: false
    })
    configurePortableDatabase(database)
    applySqliteMigrations(database)
    return database
  } catch (error) {
    if (database?.isOpen) database.close()

    throw new Error(`Could not open the Fatebound SQLite database at ${resolvedDatabaseFile}`, {
      cause: error
    })
  }
}

export function openActiveSqliteDatabase(): DatabaseSync {
  if (activeDatabase?.isOpen) {
    throw new Error('The Fatebound SQLite database is already open')
  }

  activeDatabase = openSqliteDatabase(getActiveStoragePaths().databaseFile)
  return activeDatabase
}

export function hasOpenActiveSqliteDatabase(): boolean {
  return activeDatabase?.isOpen === true
}

export function closeActiveSqliteDatabase(): void {
  const database = activeDatabase
  activeDatabase = undefined

  if (database?.isOpen) database.close()
}
