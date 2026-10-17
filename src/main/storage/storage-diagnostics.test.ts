import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { STORAGE_DIAGNOSTICS_CHANNEL } from '../../shared/storage-diagnostics.ts'
import { activateStoragePaths, createStoragePaths } from './portable-storage.ts'
import { createSqliteBackup } from './sqlite-backup.ts'
import {
  createStorageDiagnosticsHandler,
  registerStorageDiagnosticsIpc,
  type StorageDiagnosticsHandler
} from './storage-diagnostics-ipc.ts'
import { readStorageDiagnostics } from './storage-diagnostics.ts'
import {
  closeActiveSqliteDatabase,
  openActiveSqliteDatabase,
  openSqliteDatabase
} from './sqlite-storage.ts'

test('reports real SQLite health, paths, schema, and verified managed backups', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-diagnostics-test-'))
  const paths = createStoragePaths(join(root, 'data'))
  await mkdir(paths.dataDirectory)

  try {
    const setupDatabase = await openSqliteDatabase(paths.databaseFile, paths.backupsDirectory)
    await createSqliteBackup(setupDatabase, paths.backupsDirectory, {
      reason: 'automatic',
      schemaVersion: 2,
      idFactory: () => 'diagnostics-backup',
      now: () => new Date('2026-10-10T09:00:00.000Z')
    })
    setupDatabase.close()

    activateStoragePaths(paths)
    await openActiveSqliteDatabase()
    const diagnostics = await readStorageDiagnostics(() => new Date('2026-10-10T10:00:00.000Z'))

    assert.deepEqual(diagnostics, {
      status: 'ready',
      dataDirectory: paths.dataDirectory,
      databaseFile: paths.databaseFile,
      sqliteStatus: 'available',
      schemaVersion: 2,
      integrityCheck: 'ok',
      foreignKeyCheck: 'ok',
      managedBackupCount: 1,
      checkedAt: '2026-10-10T10:00:00.000Z'
    })
  } finally {
    await closeActiveSqliteDatabase()
    await rm(root, { recursive: true, force: true })
  }
})

test('returns a sanitized IPC failure instead of exposing internal errors', async () => {
  const secret = 'D:\\private\\fatebound.sqlite'
  const reportedErrors: unknown[] = []
  const handler = createStorageDiagnosticsHandler(
    async () => {
      throw new Error(`cannot read ${secret}`)
    },
    (error) => reportedErrors.push(error)
  )

  const result = await handler()

  assert.equal(result.status, 'error')
  assert.deepEqual(result, { status: 'error', code: 'diagnostics-unavailable' })
  assert.equal(reportedErrors.length, 1)
})

test('registers one argument-free handler on the dedicated diagnostics channel', async () => {
  const registrations: Array<{ channel: string; handler: StorageDiagnosticsHandler }> = []
  const expected = {
    status: 'ready' as const,
    dataDirectory: 'data',
    databaseFile: 'data/fatebound.sqlite',
    sqliteStatus: 'available' as const,
    schemaVersion: 1,
    integrityCheck: 'ok' as const,
    foreignKeyCheck: 'ok' as const,
    managedBackupCount: 0,
    checkedAt: '2026-10-10T10:00:00.000Z'
  }

  registerStorageDiagnosticsIpc(
    (channel, handler) => registrations.push({ channel, handler }),
    async () => expected
  )

  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].channel, STORAGE_DIAGNOSTICS_CHANNEL)
  assert.equal(await registrations[0].handler(), expected)
})
