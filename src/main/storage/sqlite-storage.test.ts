import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readdir, rm, truncate } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { activateStoragePaths, createStoragePaths } from './portable-storage.ts'
import { validateSqliteDatabase } from './sqlite-integrity.ts'
import {
  applySqliteMigrations,
  SQLITE_MIGRATIONS,
  type SqliteMigration
} from './sqlite-migrations.ts'
import {
  closeActiveSqliteDatabase,
  configurePortableDatabase,
  hasOpenActiveSqliteDatabase,
  openActiveSqliteDatabase,
  openSqliteConnection,
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
  run: (databaseFile: string, testRoot: string, backupsDirectory: string) => void | Promise<void>
): Promise<void> {
  const testRoot = await mkdtemp(join(tmpdir(), 'fatebound-sqlite-test-'))
  const dataDirectory = join(testRoot, 'data')
  const backupsDirectory = join(dataDirectory, 'backups')
  await mkdir(dataDirectory)

  try {
    await run(join(dataDirectory, 'fatebound.sqlite'), testRoot, backupsDirectory)
  } finally {
    closeActiveSqliteDatabase()
    await rm(testRoot, { recursive: true, force: true })
  }
}

async function createInitializedDatabase(
  databaseFile: string,
  backupsDirectory: string
): Promise<void> {
  const database = await openSqliteDatabase(databaseFile, backupsDirectory)
  database.close()
}

test('creates the database with the initial migration and portable safety settings', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const database = await openSqliteDatabase(databaseFile, backupsDirectory)

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
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const firstConnection = await openSqliteDatabase(databaseFile, backupsDirectory)
    firstConnection.exec(`
      CREATE TABLE persistence_probe (value TEXT NOT NULL) STRICT;
      INSERT INTO persistence_probe (value) VALUES ('preserved');
    `)
    firstConnection.close()

    const reopenedConnection = await openSqliteDatabase(databaseFile, backupsDirectory)

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

test('accepts quick and full integrity checks for a healthy database', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const database = await openSqliteDatabase(databaseFile, backupsDirectory)

    try {
      assert.doesNotThrow(() => validateSqliteDatabase(database, 'quick'))
      assert.doesNotThrow(() => validateSqliteDatabase(database, 'full'))
    } finally {
      database.close()
    }
  })
})

test('detects a malformed SQLite database during an integrity check', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const database = await openSqliteDatabase(databaseFile, backupsDirectory)
    database.exec(`
      CREATE TABLE integrity_probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL) STRICT;
      INSERT INTO integrity_probe (value) VALUES ('one'), ('two'), ('three');
    `)
    database.close()
    await truncate(databaseFile, 2_048)

    const malformedDatabase = openSqliteConnection(databaseFile)

    try {
      assert.throws(
        () => validateSqliteDatabase(malformedDatabase, 'full'),
        /SQLite full_check could not be completed/
      )
    } finally {
      malformedDatabase.close()
    }
  })
})

test('blocks startup before backup or migration when an existing database is malformed', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    await createInitializedDatabase(databaseFile, backupsDirectory)
    await truncate(databaseFile, 2_048)
    let backupAttempts = 0
    const migrations: readonly SqliteMigration[] = [
      ...SQLITE_MIGRATIONS,
      {
        version: 2,
        name: 'must_not_reach_corrupt_database',
        sql: 'CREATE TABLE unreachable_probe (value TEXT NOT NULL) STRICT;'
      }
    ]

    await assert.rejects(
      openSqliteDatabase(databaseFile, backupsDirectory, {
        migrations,
        async createMigrationBackup() {
          backupAttempts += 1
          throw new Error('backup must not run for a malformed database')
        }
      }),
      /Could not safely initialize/
    )

    assert.equal(backupAttempts, 0)
    await assert.rejects(readdir(backupsDirectory), { code: 'ENOENT' })
  })
})

test('detects foreign key violations left by an earlier connection', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const database = await openSqliteDatabase(databaseFile, backupsDirectory)
    database.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE parent_probe (id INTEGER PRIMARY KEY) STRICT;
      CREATE TABLE child_probe (
        id INTEGER PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES parent_probe(id)
      ) STRICT;
      INSERT INTO child_probe (id, parent_id) VALUES (1, 999);
      PRAGMA foreign_keys = ON;
    `)

    try {
      assert.throws(
        () => validateSqliteDatabase(database, 'quick'),
        /foreign_key_check found 1 violation/
      )
    } finally {
      database.close()
    }
  })
})

test('applies pending migrations in version order', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const database = await openSqliteDatabase(databaseFile, backupsDirectory)
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
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const database = await openSqliteDatabase(databaseFile, backupsDirectory)
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

test('creates a verified backup before migrating an existing database', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    await createInitializedDatabase(databaseFile, backupsDirectory)
    const migrations: readonly SqliteMigration[] = [
      ...SQLITE_MIGRATIONS,
      {
        version: 2,
        name: 'protected_migration',
        sql: 'CREATE TABLE protected_probe (value TEXT NOT NULL) STRICT;'
      }
    ]

    const database = await openSqliteDatabase(databaseFile, backupsDirectory, { migrations })

    try {
      assert.ok(
        database
          .prepare(
            "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'protected_probe'"
          )
          .get()
      )
    } finally {
      database.close()
    }

    const backupDirectories = await readdir(backupsDirectory)
    assert.equal(backupDirectories.length, 1)
    assert.match(backupDirectories[0], /pre-migration/)

    const backupDatabase = openSqliteConnection(
      join(backupsDirectory, backupDirectories[0], 'fatebound.sqlite')
    )

    try {
      assert.equal(
        backupDatabase
          .prepare(
            "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'protected_probe'"
          )
          .get(),
        undefined
      )
    } finally {
      backupDatabase.close()
    }
  })
})

test('does not migrate when the required pre-migration backup fails', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    await createInitializedDatabase(databaseFile, backupsDirectory)
    const migrations: readonly SqliteMigration[] = [
      ...SQLITE_MIGRATIONS,
      {
        version: 2,
        name: 'blocked_migration',
        sql: 'CREATE TABLE blocked_probe (value TEXT NOT NULL) STRICT;'
      }
    ]

    await assert.rejects(
      openSqliteDatabase(databaseFile, backupsDirectory, {
        migrations,
        async createMigrationBackup() {
          throw new Error('simulated backup failure')
        }
      }),
      /Could not safely initialize/
    )

    const database = openSqliteConnection(databaseFile)

    try {
      assert.equal(
        database
          .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'blocked_probe'")
          .get(),
        undefined
      )
      assert.equal(
        (
          database
            .prepare('SELECT MAX(version) AS version FROM fatebound_schema_migrations')
            .get() as {
            version: number
          }
        ).version,
        1
      )
    } finally {
      database.close()
    }
  })
})

test('keeps the pre-migration backup and does not restore automatically after a later migration fails', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    await createInitializedDatabase(databaseFile, backupsDirectory)
    const migrations: readonly SqliteMigration[] = [
      ...SQLITE_MIGRATIONS,
      {
        version: 2,
        name: 'completed_before_failure',
        sql: 'CREATE TABLE completed_probe (value TEXT NOT NULL) STRICT;'
      },
      {
        version: 3,
        name: 'failing_after_completed',
        sql: 'THIS IS NOT VALID SQL;'
      }
    ]

    await assert.rejects(
      openSqliteDatabase(databaseFile, backupsDirectory, { migrations }),
      /Could not safely initialize/
    )

    const database = openSqliteConnection(databaseFile)

    try {
      assert.ok(
        database
          .prepare(
            "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'completed_probe'"
          )
          .get()
      )
      assert.equal(
        (
          database
            .prepare('SELECT MAX(version) AS version FROM fatebound_schema_migrations')
            .get() as {
            version: number
          }
        ).version,
        2
      )
    } finally {
      database.close()
    }

    assert.equal((await readdir(backupsDirectory)).length, 1)
  })
})

test('does not create an unnecessary backup for a completely new database', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    let backupAttempts = 0
    const database = await openSqliteDatabase(databaseFile, backupsDirectory, {
      async createMigrationBackup() {
        backupAttempts += 1
        throw new Error('a new database must not be backed up before its initial migration')
      }
    })

    database.close()
    assert.equal(backupAttempts, 0)
    await assert.rejects(readdir(backupsDirectory), { code: 'ENOENT' })
  })
})

test('blocks pending migrations when preflight foreign key validation fails', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const setupDatabase = await openSqliteDatabase(databaseFile, backupsDirectory)
    setupDatabase.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE preflight_parent (id INTEGER PRIMARY KEY) STRICT;
      CREATE TABLE preflight_child (
        id INTEGER PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES preflight_parent(id)
      ) STRICT;
      INSERT INTO preflight_child (id, parent_id) VALUES (1, 999);
    `)
    setupDatabase.close()

    const migrations: readonly SqliteMigration[] = [
      ...SQLITE_MIGRATIONS,
      {
        version: 2,
        name: 'must_not_run',
        sql: 'CREATE TABLE must_not_exist (value TEXT NOT NULL) STRICT;'
      }
    ]

    await assert.rejects(
      openSqliteDatabase(databaseFile, backupsDirectory, { migrations }),
      /Could not safely initialize/
    )

    const database = openSqliteConnection(databaseFile)

    try {
      assert.equal(
        database
          .prepare(
            "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'must_not_exist'"
          )
          .get(),
        undefined
      )
    } finally {
      database.close()
    }
  })
})

test('rejects a database whose migration history is newer than the application', async () => {
  await withTemporaryDatabase(async (databaseFile, _testRoot, backupsDirectory) => {
    const database = await openSqliteDatabase(databaseFile, backupsDirectory)
    database
      .prepare('INSERT INTO fatebound_schema_migrations (version, name) VALUES (?, ?)')
      .run(2, 'future_migration')
    database.close()

    await assert.rejects(openSqliteDatabase(databaseFile, backupsDirectory), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /Could not safely initialize/)
      assert.ok(error.cause instanceof Error)
      assert.match(
        error.cause.message,
        /database schema version 2 is newer than this Fatebound build supports/
      )
      return true
    })
  })
})

test('reports an opening error and closes a partially initialized connection', async () => {
  await withTemporaryDatabase(async (_databaseFile, testRoot, backupsDirectory) => {
    const directoryInPlaceOfDatabase = join(testRoot, 'not-a-database.sqlite')
    await mkdir(directoryInPlaceOfDatabase)

    await assert.rejects(
      openSqliteDatabase(directoryInPlaceOfDatabase, backupsDirectory),
      /Could not safely initialize/
    )
  })
})

test('opens the active portable path and closes the connection idempotently', async () => {
  await withTemporaryDatabase(async (_databaseFile, testRoot) => {
    const paths = createStoragePaths(join(testRoot, 'active-data'))
    await mkdir(paths.dataDirectory)
    activateStoragePaths(paths)

    const database = await openActiveSqliteDatabase()

    assert.equal(database.location(), paths.databaseFile)
    assert.equal(hasOpenActiveSqliteDatabase(), true)

    closeActiveSqliteDatabase()
    closeActiveSqliteDatabase()

    assert.equal(database.isOpen, false)
    assert.equal(hasOpenActiveSqliteDatabase(), false)
    assert.throws(() => database.prepare('SELECT 1'), /database is not open/)
  })
})

test('keeps connection opening and portable configuration as separate steps', async () => {
  await withTemporaryDatabase((databaseFile) => {
    const database = openSqliteConnection(databaseFile)

    try {
      configurePortableDatabase(database)
      assert.equal((database.prepare('PRAGMA synchronous').get() as PragmaRow).synchronous, 3)
      assert.equal(
        database
          .prepare(
            "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'fatebound_schema_migrations'"
          )
          .get(),
        undefined
      )
    } finally {
      database.close()
    }
  })
})
