import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createSqliteBackup, type SqliteBackupReason } from './sqlite-backup.ts'
import {
  enforceSqliteBackupRetention,
  listManagedSqliteBackups
} from './sqlite-backup-retention.ts'
import { applySqliteMigrations } from './sqlite-migrations.ts'
import { configurePortableDatabase, openSqliteConnection } from './sqlite-storage.ts'

async function withRetentionFixture(
  run: (database: DatabaseSync, backupsDirectory: string) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-retention-test-'))
  const dataDirectory = join(root, 'data')
  const backupsDirectory = join(dataDirectory, 'backups')
  await mkdir(dataDirectory)
  const database = openSqliteConnection(join(dataDirectory, 'fatebound.sqlite'))
  configurePortableDatabase(database)
  applySqliteMigrations(database)

  try {
    await run(database, backupsDirectory)
  } finally {
    database.close()
    await rm(root, { recursive: true, force: true })
  }
}

async function createBackups(
  database: DatabaseSync,
  backupsDirectory: string,
  reason: SqliteBackupReason,
  count: number,
  dateOffset = 0
): Promise<readonly string[]> {
  const directories: string[] = []

  for (let index = 0; index < count; index += 1) {
    const sequence = dateOffset + index
    const result = await createSqliteBackup(database, backupsDirectory, {
      reason,
      schemaVersion: 1,
      idFactory: () => `backup-${reason}-${sequence}`,
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, sequence))
    })
    directories.push(result.directory)
  }

  return directories
}

test('retention keeps six automatic, two protected, and every manual backup', async () => {
  await withRetentionFixture(async (database, backupsDirectory) => {
    const automatic = await createBackups(database, backupsDirectory, 'automatic', 8)
    const protectedBackups = await createBackups(database, backupsDirectory, 'pre-migration', 4, 20)
    const manual = await createBackups(database, backupsDirectory, 'manual', 2, 40)

    const result = await enforceSqliteBackupRetention(backupsDirectory)
    const retained = await listManagedSqliteBackups(backupsDirectory)

    assert.equal(result.deletedDirectories.length, 4)
    assert.equal(retained.filter((entry) => entry.manifest.reason === 'automatic').length, 6)
    assert.equal(retained.filter((entry) => entry.manifest.reason === 'pre-migration').length, 2)
    assert.equal(retained.filter((entry) => entry.manifest.reason === 'manual').length, 2)
    await assert.rejects(readdir(automatic[0]), { code: 'ENOENT' })
    assert.equal(result.deletedDirectories.includes(automatic[0]), true)
    assert.equal(result.deletedDirectories.includes(protectedBackups[0]), true)
    for (const directory of manual) {
      assert.equal((await readdir(directory)).length, 2)
    }
  })
})

test('retention never deletes the final valid managed backup', async () => {
  await withRetentionFixture(async (database, backupsDirectory) => {
    const [onlyBackup] = await createBackups(database, backupsDirectory, 'automatic', 1)
    const result = await enforceSqliteBackupRetention(backupsDirectory, {
      automaticLimit: 0,
      protectedLimit: 0
    })

    assert.deepEqual(result.deletedDirectories, [])
    assert.equal((await readdir(onlyBackup)).length, 2)
  })
})

test('invalid manifests, extra files, and unknown paths remain outside retention', async () => {
  await withRetentionFixture(async (database, backupsDirectory) => {
    const automatic = await createBackups(database, backupsDirectory, 'automatic', 9)
    const invalidManifest = join(automatic[0], 'manifest.json')
    await writeFile(invalidManifest, '{ invalid json', 'utf8')
    await writeFile(join(automatic[1], 'unknown.txt'), 'do not delete', 'utf8')
    const unknownDirectory = join(backupsDirectory, 'other-application')
    await mkdir(unknownDirectory)
    await writeFile(join(unknownDirectory, 'data.bin'), 'unknown', 'utf8')
    const unknownFile = join(backupsDirectory, 'notes.txt')
    await writeFile(unknownFile, 'keep', 'utf8')

    const result = await enforceSqliteBackupRetention(backupsDirectory)

    assert.equal(result.deletedDirectories.length, 1)
    assert.equal(await readFile(invalidManifest, 'utf8'), '{ invalid json')
    assert.equal(await readFile(join(automatic[1], 'unknown.txt'), 'utf8'), 'do not delete')
    assert.equal(await readFile(join(unknownDirectory, 'data.bin'), 'utf8'), 'unknown')
    assert.equal(await readFile(unknownFile, 'utf8'), 'keep')
  })
})
