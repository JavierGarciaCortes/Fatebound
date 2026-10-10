import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import {
  calculateFileSha256,
  createSqliteBackup,
  type SqliteBackupManifest
} from './sqlite-backup.ts'
import { applySqliteMigrations } from './sqlite-migrations.ts'
import { configurePortableDatabase, openSqliteConnection } from './sqlite-storage.ts'

const FIXED_ID = '00000000-0000-4000-8000-000000000001'
const FIXED_DATE = new Date('2026-10-10T12:34:56.000Z')

async function withBackupFixture(
  run: (
    database: DatabaseSync,
    databaseFile: string,
    backupsDirectory: string,
    testRoot: string
  ) => void | Promise<void>
): Promise<void> {
  const testRoot = await mkdtemp(join(tmpdir(), 'fatebound-backup-test-'))
  const dataDirectory = join(testRoot, 'data')
  const databaseFile = join(dataDirectory, 'fatebound.sqlite')
  const backupsDirectory = join(dataDirectory, 'backups')
  await mkdir(dataDirectory)

  const database = openSqliteConnection(databaseFile)
  configurePortableDatabase(database)
  applySqliteMigrations(database)
  database.exec(`
    CREATE TABLE backup_probe (value TEXT NOT NULL) STRICT;
    INSERT INTO backup_probe (value) VALUES ('preserved');
  `)

  try {
    await run(database, databaseFile, backupsDirectory, testRoot)
  } finally {
    if (database.isOpen) database.close()
    await rm(testRoot, { recursive: true, force: true })
  }
}

test('creates, verifies, and reopens a consistent node:sqlite backup', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory) => {
    const result = await createSqliteBackup(database, backupsDirectory, {
      reason: 'manual',
      schemaVersion: 1
    })

    const backupDatabase = new DatabaseSync(result.databaseFile, { readOnly: true })

    try {
      const row = backupDatabase.prepare('SELECT value FROM backup_probe').get() as {
        value: string
      }
      assert.equal(row.value, 'preserved')
      assert.deepEqual(
        backupDatabase
          .prepare('PRAGMA integrity_check')
          .all()
          .map((row) => ({ ...row })),
        [{ integrity_check: 'ok' }]
      )
      assert.deepEqual(backupDatabase.prepare('PRAGMA foreign_key_check').all(), [])
    } finally {
      backupDatabase.close()
    }
  })
})

test('writes a relative manifest with size and matching SHA-256', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory, testRoot) => {
    const result = await createSqliteBackup(database, backupsDirectory, {
      reason: 'pre-migration',
      schemaVersion: 1,
      idFactory: () => FIXED_ID,
      now: () => FIXED_DATE
    })
    const manifest = JSON.parse(await readFile(result.manifestFile, 'utf8')) as SqliteBackupManifest
    const databaseStats = await stat(result.databaseFile)

    assert.deepEqual(manifest, result.manifest)
    assert.equal(manifest.formatVersion, 2)
    assert.equal(manifest.application, 'fatebound')
    assert.equal(manifest.id, FIXED_ID)
    assert.equal(manifest.createdAt, FIXED_DATE.toISOString())
    assert.equal(manifest.reason, 'pre-migration')
    assert.equal(manifest.schemaVersion, 1)
    assert.equal(manifest.databaseFile, 'fatebound.sqlite')
    assert.equal(manifest.sizeBytes, databaseStats.size)
    assert.equal(manifest.sha256, await calculateFileSha256(result.databaseFile))
    assert.equal(JSON.stringify(manifest).includes(testRoot), false)
  })
})

test('never overwrites an already published backup', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory) => {
    const options = {
      reason: 'manual' as const,
      schemaVersion: 1,
      idFactory: () => FIXED_ID,
      now: () => FIXED_DATE
    }
    const firstBackup = await createSqliteBackup(database, backupsDirectory, options)
    const firstHash = await calculateFileSha256(firstBackup.databaseFile)
    database.prepare('INSERT INTO backup_probe (value) VALUES (?)').run('newer')

    await assert.rejects(
      createSqliteBackup(database, backupsDirectory, options),
      /Could not create a verified Fatebound SQLite backup/
    )

    assert.equal(await calculateFileSha256(firstBackup.databaseFile), firstHash)
    assert.deepEqual(await readdir(backupsDirectory), [
      'backup-20261010T123456Z-manual-00000000-0000-4000-8000-000000000001'
    ])
  })
})

test('removes partial files and publishes nothing when backup is interrupted', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory) => {
    await assert.rejects(
      createSqliteBackup(database, backupsDirectory, {
        reason: 'manual',
        schemaVersion: 1,
        async backupDatabase(_sourceDatabase, destinationFile) {
          await writeFile(destinationFile, 'incomplete backup')
          throw new Error('simulated interruption')
        }
      }),
      /Could not create a verified Fatebound SQLite backup/
    )

    assert.deepEqual(await readdir(backupsDirectory), [])
  })
})

test('does not publish a backup that fails SQLite verification', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory) => {
    await assert.rejects(
      createSqliteBackup(database, backupsDirectory, {
        reason: 'manual',
        schemaVersion: 1,
        async backupDatabase(_sourceDatabase, destinationFile) {
          await writeFile(destinationFile, 'not a SQLite database')
          return 0
        }
      }),
      /Could not create a verified Fatebound SQLite backup/
    )

    assert.deepEqual(await readdir(backupsDirectory), [])
  })
})

test('cleans stale temporary backup directories without deleting published backups', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory) => {
    const staleDirectory = join(backupsDirectory, '.partial-stale')
    await mkdir(staleDirectory, { recursive: true })
    await writeFile(join(staleDirectory, '.fatebound-backup-staging'), 'fatebound\n')
    await writeFile(join(staleDirectory, 'incomplete.sqlite'), 'incomplete')
    const existingBackupDirectory = join(backupsDirectory, 'backup-existing')
    await mkdir(existingBackupDirectory)
    await writeFile(join(existingBackupDirectory, 'keep.txt'), 'keep')

    await createSqliteBackup(database, backupsDirectory, {
      reason: 'manual',
      schemaVersion: 1
    })

    const entries = await readdir(backupsDirectory)
    assert.equal(entries.includes('.partial-stale'), false)
    assert.equal(entries.includes('backup-existing'), true)
    assert.equal(entries.filter((entry) => entry.startsWith('backup-')).length, 2)
  })
})

test('does not remove an unknown directory that only resembles backup staging', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory) => {
    const unknownDirectory = join(backupsDirectory, '.partial-unknown')
    await mkdir(unknownDirectory, { recursive: true })
    await writeFile(join(unknownDirectory, 'keep.txt'), 'unknown data')

    await createSqliteBackup(database, backupsDirectory, {
      reason: 'manual',
      schemaVersion: 1
    })

    assert.deepEqual(await readFile(join(unknownDirectory, 'keep.txt'), 'utf8'), 'unknown data')
  })
})

test('reports ENOSPC before publication and preserves earlier backups', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory) => {
    const existing = await createSqliteBackup(database, backupsDirectory, {
      reason: 'manual',
      schemaVersion: 1
    })

    await assert.rejects(
      createSqliteBackup(database, backupsDirectory, {
        reason: 'automatic',
        schemaVersion: 1,
        async getAvailableBytes() {
          return 0n
        }
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /Could not create a verified Fatebound SQLite backup/)
        assert.equal((error.cause as NodeJS.ErrnoException).code, 'ENOSPC')
        return true
      }
    )

    assert.equal((await stat(existing.databaseFile)).isFile(), true)
    assert.equal(
      (await readdir(backupsDirectory)).filter((name) => name.startsWith('backup-')).length,
      1
    )
  })
})

test('cleans an ENOSPC write failure without touching earlier backups', async () => {
  await withBackupFixture(async (database, _databaseFile, backupsDirectory) => {
    const existing = await createSqliteBackup(database, backupsDirectory, {
      reason: 'manual',
      schemaVersion: 1
    })

    await assert.rejects(
      createSqliteBackup(database, backupsDirectory, {
        reason: 'automatic',
        schemaVersion: 1,
        async backupDatabase(_sourceDatabase, destinationFile) {
          await writeFile(destinationFile, 'partial')
          const error = new Error('disk full') as NodeJS.ErrnoException
          error.code = 'ENOSPC'
          throw error
        }
      }),
      /Could not create a verified Fatebound SQLite backup/
    )

    assert.equal((await stat(existing.databaseFile)).isFile(), true)
    assert.equal(
      (await readdir(backupsDirectory)).filter((name) => name.startsWith('backup-')).length,
      1
    )
  })
})
