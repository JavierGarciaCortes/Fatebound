import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  SQLITE_RESTORE_CANCEL_CHANNEL,
  SQLITE_RESTORE_CONFIRM_CHANNEL,
  SQLITE_RESTORE_SELECT_CHANNEL
} from '../../shared/sqlite-safe-restore.ts'
import { activateStoragePaths, createStoragePaths, type StoragePaths } from './portable-storage.ts'
import { createSqliteBackup, type SqliteBackupResult } from './sqlite-backup.ts'
import { listManagedSqliteBackups } from './sqlite-backup-retention.ts'
import { createSqliteRestoreHandlers, registerSqliteRestoreIpc } from './sqlite-safe-restore-ipc.ts'
import {
  inspectRestorableSqliteBackup,
  installPreparedSqliteRestore,
  prepareSqliteRestore,
  recordProtectedSqliteRestoreBackup,
  recoverInterruptedSqliteRestore,
  SafeSqliteRestoreError,
  type RestorableSqliteBackup
} from './sqlite-safe-restore.ts'
import { SQLITE_MIGRATIONS } from './sqlite-migrations.ts'
import {
  closeActiveSqliteDatabase,
  openActiveSqliteDatabase,
  openSqliteConnection,
  openSqliteDatabase,
  restoreActiveSqliteBackup
} from './sqlite-storage.ts'

const CURRENT_SQLITE_SCHEMA_VERSION = Math.max(
  ...SQLITE_MIGRATIONS.map((migration) => migration.version)
)

async function withRestoreFixture(
  run: (paths: StoragePaths, externalBackups: string) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-safe-restore-test-'))
  const paths = createStoragePaths(join(root, 'data'))
  const externalBackups = join(root, 'external-backups')
  await mkdir(paths.dataDirectory)
  await mkdir(externalBackups)

  try {
    await run(paths, externalBackups)
  } finally {
    await closeActiveSqliteDatabase()
    await rm(root, { recursive: true, force: true })
  }
}

async function createRestorableProbe(
  paths: StoragePaths,
  externalBackups: string
): Promise<SqliteBackupResult> {
  const database = await openSqliteDatabase(paths.databaseFile, paths.backupsDirectory)
  database.exec(`
    CREATE TABLE restore_probe (value TEXT NOT NULL) STRICT;
    INSERT INTO restore_probe (value) VALUES ('from-backup');
  `)
  const backup = await createSqliteBackup(database, externalBackups, {
    reason: 'manual',
    schemaVersion: CURRENT_SQLITE_SCHEMA_VERSION
  })
  database.prepare('UPDATE restore_probe SET value = ?').run('current-data')
  database.close()
  return backup
}

function readProbe(databaseFile: string): string {
  const database = openSqliteConnection(databaseFile)
  try {
    return (database.prepare('SELECT value FROM restore_probe').get() as { value: string }).value
  } finally {
    database.close()
  }
}

test('rejects incomplete and schema-incompatible backup folders', async () => {
  await withRestoreFixture(async (paths, externalBackups) => {
    const invalidDirectory = join(externalBackups, 'invalid')
    await mkdir(invalidDirectory)
    await writeFile(join(invalidDirectory, 'manifest.json'), '{}')

    await assert.rejects(inspectRestorableSqliteBackup(invalidDirectory), (error: unknown) => {
      assert.ok(error instanceof SafeSqliteRestoreError)
      assert.equal(error.code, 'invalid-backup')
      return true
    })

    const backup = await createRestorableProbe(paths, externalBackups)
    const manifest = JSON.parse(await readFile(backup.manifestFile, 'utf8')) as Record<
      string,
      unknown
    >
    await writeFile(
      backup.manifestFile,
      `${JSON.stringify({ ...manifest, schemaVersion: 999 }, null, 2)}\n`
    )

    await assert.rejects(inspectRestorableSqliteBackup(backup.directory), (error: unknown) => {
      assert.ok(error instanceof SafeSqliteRestoreError)
      assert.equal(error.code, 'incompatible-backup')
      return true
    })
  })
})

test('restores a verified backup and preserves a protected copy of the previous database', async () => {
  await withRestoreFixture(async (paths, externalBackups) => {
    const source = await createRestorableProbe(paths, externalBackups)
    activateStoragePaths(paths)
    await openActiveSqliteDatabase()

    const selected = await inspectRestorableSqliteBackup(source.directory)
    await restoreActiveSqliteBackup(selected)
    await closeActiveSqliteDatabase()

    assert.equal(readProbe(paths.databaseFile), 'from-backup')
    assert.equal(
      (await listManagedSqliteBackups(paths.backupsDirectory)).some(
        (backup) => backup.manifest.reason === 'protected'
      ),
      true
    )
  })
})

test('rolls back an interrupted replacement to the previous verified database', async () => {
  await withRestoreFixture(async (paths, externalBackups) => {
    const source = await createRestorableProbe(paths, externalBackups)
    const currentDatabase = openSqliteConnection(paths.databaseFile)
    let protectedBackup: SqliteBackupResult
    try {
      protectedBackup = await createSqliteBackup(currentDatabase, paths.backupsDirectory, {
        reason: 'protected',
        schemaVersion: CURRENT_SQLITE_SCHEMA_VERSION
      })
    } finally {
      currentDatabase.close()
    }

    const selected = await inspectRestorableSqliteBackup(source.directory)
    let prepared = await prepareSqliteRestore(selected, paths)
    prepared = await recordProtectedSqliteRestoreBackup(paths, prepared, protectedBackup.directory)
    await installPreparedSqliteRestore(paths, prepared)

    assert.equal(readProbe(paths.databaseFile), 'from-backup')
    assert.equal(await recoverInterruptedSqliteRestore(paths), 'rolled-back')
    assert.equal(readProbe(paths.databaseFile), 'current-data')
    assert.equal((await stat(source.manifestFile)).isFile(), true)
  })
})

test('recovers the protected database when an interrupted restore workspace is missing', async () => {
  await withRestoreFixture(async (paths, externalBackups) => {
    const source = await createRestorableProbe(paths, externalBackups)
    const currentDatabase = openSqliteConnection(paths.databaseFile)
    let protectedBackup: SqliteBackupResult
    try {
      protectedBackup = await createSqliteBackup(currentDatabase, paths.backupsDirectory, {
        reason: 'protected',
        schemaVersion: CURRENT_SQLITE_SCHEMA_VERSION
      })
    } finally {
      currentDatabase.close()
    }

    const selected = await inspectRestorableSqliteBackup(source.directory)
    let prepared = await prepareSqliteRestore(selected, paths)
    prepared = await recordProtectedSqliteRestoreBackup(paths, prepared, protectedBackup.directory)
    prepared = await installPreparedSqliteRestore(paths, prepared)
    await rm(prepared.workspaceDirectory, { recursive: true, force: false })

    assert.equal(readProbe(paths.databaseFile), 'from-backup')
    assert.equal(await recoverInterruptedSqliteRestore(paths), 'rolled-back')
    assert.equal(readProbe(paths.databaseFile), 'current-data')
    assert.equal((await stat(source.manifestFile)).isFile(), true)
  })
})

test('binds confirmation to the main-held selection and registers three argument-free channels', async () => {
  const manifest = {
    formatVersion: 2 as const,
    application: 'fatebound' as const,
    id: 'selected',
    createdAt: '2026-10-11T12:34:56.000Z',
    reason: 'manual' as const,
    schemaVersion: CURRENT_SQLITE_SCHEMA_VERSION,
    databaseFile: 'fatebound.sqlite' as const,
    sizeBytes: 4096,
    sha256: '0'.repeat(64)
  }
  const selected: RestorableSqliteBackup = {
    entry: {
      directory: 'D:\\selected-backup',
      databaseFile: 'D:\\selected-backup\\fatebound.sqlite',
      manifestFile: 'D:\\selected-backup\\manifest.json',
      manifest
    },
    preview: {
      createdAt: manifest.createdAt,
      reason: manifest.reason,
      schemaVersion: manifest.schemaVersion,
      sizeBytes: manifest.sizeBytes
    }
  }
  const changed: RestorableSqliteBackup = {
    ...selected,
    entry: { ...selected.entry, manifest: { ...manifest, sha256: '1'.repeat(64) } }
  }
  let inspections = 0
  let restoreCalls = 0
  const handlers = createSqliteRestoreHandlers(
    async () => selected.entry.directory,
    async () => (++inspections === 1 ? selected : changed),
    async () => {
      restoreCalls += 1
    }
  )

  const previewResult = await handlers.select()
  assert.equal(previewResult.status, 'ready')
  assert.equal(JSON.stringify(previewResult).includes('selected-backup'), false)
  assert.deepEqual(await handlers.confirm(), { status: 'error', code: 'backup-changed' })
  assert.equal(restoreCalls, 0)
  assert.equal((await handlers.select()).status, 'ready')
  assert.deepEqual(await handlers.cancel(), { status: 'cancelled' })
  assert.deepEqual(await handlers.confirm(), {
    status: 'error',
    code: 'selection-required'
  })
  assert.equal(restoreCalls, 0)

  const recoveryFailureHandlers = createSqliteRestoreHandlers(
    async () => selected.entry.directory,
    async () => selected,
    async () => {
      throw new SafeSqliteRestoreError('active-recovery-failed', 'private recovery details')
    }
  )
  assert.equal((await recoveryFailureHandlers.select()).status, 'ready')
  assert.deepEqual(await recoveryFailureHandlers.confirm(), {
    status: 'error',
    code: 'recovery-required'
  })

  const channels: string[] = []
  registerSqliteRestoreIpc(
    (channel) => channels.push(channel),
    async () => undefined,
    async () => selected,
    async () => undefined
  )
  assert.deepEqual(channels, [
    SQLITE_RESTORE_SELECT_CHANNEL,
    SQLITE_RESTORE_CONFIRM_CHANNEL,
    SQLITE_RESTORE_CANCEL_CHANNEL
  ])
})
