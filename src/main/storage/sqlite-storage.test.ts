import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { activateStoragePaths, createStoragePaths } from './portable-storage.ts'
import {
  applySqliteMigrations,
  SQLITE_MIGRATIONS,
  type SqliteMigration
} from './sqlite-migrations.ts'
import {
  closeActiveSqliteDatabase,
  hasOpenActiveSqliteDatabase,
  openActiveSqliteDatabase,
  openSqliteDatabase
} from './sqlite-storage.ts'

interface PragmaRow {
  readonly journal_mode?: string
  readonly synchronous?: number
  readonly foreign_keys?: number
  readonly temp_store?: number
  readonly trusted_schema?: number
}

async function withTemporaryDatabase(
  run: (databaseFile: string, testRoot: string) => void | Promise<void>
): Promise<void> {
  const testRoot = await mkdtemp(join(tmpdir(), 'fatebound-sqlite-test-'))
  const dataDirectory = join(testRoot, 'data')
  await mkdir(dataDirectory)

  try {
    await run(join(dataDirectory, 'fatebound.sqlite'), testRoot)
  } finally {
    closeActiveSqliteDatabase()
    await rm(testRoot, { recursive: true, force: true })
  }
}

test('creates the database with the initial migration and portable safety settings', async () => {
  await withTemporaryDatabase((databaseFile) => {
    const database = openSqliteDatabase(databaseFile)

    try {
      assert.equal(database.location(), databaseFile)
      const migration = database
        .prepare('SELECT version, name FROM fatebound_schema_migrations')
        .get() as { version: number; name: string }
      assert.equal(migration.version, 1)
      assert.equal(migration.name, 'initialize_migration_tracking')
      assert.equal(
        (database.prepare('PRAGMA journal_mode').get() as PragmaRow).journal_mode,
        'delete'
      )
      assert.equal((database.prepare('PRAGMA synchronous').get() as PragmaRow).synchronous, 3)
      assert.equal((database.prepare('PRAGMA foreign_keys').get() as PragmaRow).foreign_keys, 1)
      assert.equal((database.prepare('PRAGMA temp_store').get() as PragmaRow).temp_store, 2)
      assert.equal((database.prepare('PRAGMA trusted_schema').get() as PragmaRow).trusted_schema, 0)
    } finally {
      database.close()
    }
  })
})

test('persists data and does not reapply migrations when reopened', async () => {
  await withTemporaryDatabase((databaseFile) => {
    const firstConnection = openSqliteDatabase(databaseFile)
    firstConnection.exec(`
      CREATE TABLE persistence_probe (value TEXT NOT NULL) STRICT;
      INSERT INTO persistence_probe (value) VALUES ('preserved');
    `)
    firstConnection.close()

    const reopenedConnection = openSqliteDatabase(databaseFile)

    try {
      const persistedRow = reopenedConnection
        .prepare('SELECT value FROM persistence_probe')
        .get() as { value: string }
      assert.equal(persistedRow.value, 'preserved')
      assert.equal(
        (
          reopenedConnection
            .prepare('SELECT COUNT(*) AS count FROM fatebound_schema_migrations')
            .get() as { count: number }
        ).count,
        1
      )
    } finally {
      reopenedConnection.close()
    }
  })
})

test('applies pending migrations in version order', async () => {
  await withTemporaryDatabase((databaseFile) => {
    const database = openSqliteDatabase(databaseFile)
    const migrations: readonly SqliteMigration[] = [
      ...SQLITE_MIGRATIONS,
      {
        version: 2,
        name: 'test_pending_migration',
        sql: 'CREATE TABLE migration_probe (value TEXT NOT NULL) STRICT;'
      }
    ]

    try {
      applySqliteMigrations(database, migrations)

      const migrationRows = database
        .prepare('SELECT version, name FROM fatebound_schema_migrations ORDER BY version')
        .all()
        .map((row) => ({ ...row }))
      assert.deepEqual(migrationRows, [
        { version: 1, name: 'initialize_migration_tracking' },
        { version: 2, name: 'test_pending_migration' }
      ])
      const probeTable = database
        .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = ?")
        .get('migration_probe') as { name: string }
      assert.equal(probeTable.name, 'migration_probe')
    } finally {
      database.close()
    }
  })
})

test('rolls back a failed migration without recording it', async () => {
  await withTemporaryDatabase((databaseFile) => {
    const database = openSqliteDatabase(databaseFile)
    const migrations: readonly SqliteMigration[] = [
      ...SQLITE_MIGRATIONS,
      {
        version: 2,
        name: 'test_failed_migration',
        sql: `
          CREATE TABLE rolled_back_probe (value TEXT NOT NULL) STRICT;
          THIS IS NOT VALID SQL;
        `
      }
    ]

    try {
      assert.throws(
        () => applySqliteMigrations(database, migrations),
        /SQLite migration 2 \(test_failed_migration\) failed/
      )
      assert.equal(
        (
          database.prepare('SELECT COUNT(*) AS count FROM fatebound_schema_migrations').get() as {
            count: number
          }
        ).count,
        1
      )
      assert.equal(
        database
          .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = ?")
          .get('rolled_back_probe'),
        undefined
      )
    } finally {
      database.close()
    }
  })
})

test('rejects a database whose migration history is newer than the application', async () => {
  await withTemporaryDatabase((databaseFile) => {
    const database = openSqliteDatabase(databaseFile)
    database
      .prepare('INSERT INTO fatebound_schema_migrations (version, name) VALUES (?, ?)')
      .run(2, 'future_migration')
    database.close()

    assert.throws(
      () => openSqliteDatabase(databaseFile),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /Could not open the Fatebound SQLite database/)
        assert.ok(error.cause instanceof Error)
        assert.match(
          error.cause.message,
          /database schema version 2 is newer than this Fatebound build supports/
        )
        return true
      }
    )
  })
})

test('reports an opening error and closes a partially initialized connection', async () => {
  await withTemporaryDatabase(async (_databaseFile, testRoot) => {
    const directoryInPlaceOfDatabase = join(testRoot, 'not-a-database.sqlite')
    await mkdir(directoryInPlaceOfDatabase)

    assert.throws(
      () => openSqliteDatabase(directoryInPlaceOfDatabase),
      /Could not open the Fatebound SQLite database/
    )
  })
})

test('opens the active portable path and closes the connection idempotently', async () => {
  await withTemporaryDatabase(async (_databaseFile, testRoot) => {
    const paths = createStoragePaths(join(testRoot, 'active-data'))
    await mkdir(paths.dataDirectory)
    activateStoragePaths(paths)

    const database = openActiveSqliteDatabase()

    assert.equal(database.location(), paths.databaseFile)
    assert.equal(hasOpenActiveSqliteDatabase(), true)

    closeActiveSqliteDatabase()
    closeActiveSqliteDatabase()

    assert.equal(database.isOpen, false)
    assert.equal(hasOpenActiveSqliteDatabase(), false)
    assert.throws(() => database.prepare('SELECT 1'), /database is not open/)
  })
})
