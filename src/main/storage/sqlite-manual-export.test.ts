import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { test } from 'node:test'
import { SQLITE_MANUAL_EXPORT_CHANNEL } from '../../shared/sqlite-manual-export.ts'
import { activateStoragePaths, createStoragePaths } from './portable-storage.ts'
import type { SqliteBackupResult } from './sqlite-backup.ts'
import { inspectManagedSqliteBackup } from './sqlite-backup-retention.ts'
import {
  createManualSqliteExportHandler,
  registerManualSqliteExportIpc,
  type ManualSqliteExportHandler
} from './sqlite-manual-export-ipc.ts'
import {
  exportManualSqliteBackup,
  ManualSqliteExportDestinationError
} from './sqlite-manual-export.ts'
import { closeActiveSqliteDatabase, openActiveSqliteDatabase } from './sqlite-storage.ts'

async function withManualExportFixture(
  run: (
    paths: ReturnType<typeof createStoragePaths>,
    exportDirectory: string
  ) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-manual-export-test-'))
  const paths = createStoragePaths(join(root, 'active-data'))
  const exportDirectory = join(root, 'external-backups')
  await mkdir(paths.dataDirectory)
  await mkdir(exportDirectory)

  try {
    await run(paths, exportDirectory)
  } finally {
    await closeActiveSqliteDatabase()
    await rm(root, { recursive: true, force: true })
  }
}

test('exports and revalidates a self-contained backup through the active SQLite queue', async () => {
  await withManualExportFixture(async (paths, exportDirectory) => {
    activateStoragePaths(paths)
    await openActiveSqliteDatabase()

    const result = await exportManualSqliteBackup(exportDirectory)
    const verified = await inspectManagedSqliteBackup(result.directory)

    assert.ok(verified)
    assert.equal(result.manifest.reason, 'manual')
    assert.deepEqual((await readdir(result.directory)).sort(), [
      'fatebound.sqlite',
      'manifest.json'
    ])
    assert.equal(JSON.stringify(result.manifest).includes(exportDirectory), false)
    assert.equal(
      JSON.parse(await readFile(result.manifestFile, 'utf8')).sha256,
      result.manifest.sha256
    )
  })
})

test('rejects destinations inside active data before starting a backup', async () => {
  await withManualExportFixture(async (paths) => {
    const nestedDestination = join(paths.backupsDirectory, 'manual')
    await mkdir(nestedDestination, { recursive: true })
    let backupStarted = false

    await assert.rejects(
      exportManualSqliteBackup(nestedDestination, {
        storagePaths: paths,
        async createBackup() {
          backupStarted = true
          throw new Error('must not run')
        }
      }),
      ManualSqliteExportDestinationError
    )

    assert.equal(backupStarted, false)
    assert.deepEqual(await readdir(nestedDestination), [])
  })
})

test('removes only its own published directory when final validation fails', async () => {
  await withManualExportFixture(async (paths, exportDirectory) => {
    const foreignFile = join(exportDirectory, 'keep.txt')
    await writeFile(foreignFile, 'foreign')
    const createdAt = '2026-10-11T12:34:56.000Z'
    const id = 'invalid-export'
    const directory = join(exportDirectory, 'backup-20261011T123456Z-manual-invalid-export')
    const databaseFile = join(directory, 'fatebound.sqlite')
    const manifestFile = join(directory, 'manifest.json')
    const result: SqliteBackupResult = {
      directory,
      databaseFile,
      manifestFile,
      manifest: {
        formatVersion: 2,
        application: 'fatebound',
        id,
        createdAt,
        reason: 'manual',
        schemaVersion: 1,
        databaseFile: 'fatebound.sqlite',
        sizeBytes: 7,
        sha256: '0'.repeat(64)
      }
    }

    await assert.rejects(
      exportManualSqliteBackup(exportDirectory, {
        storagePaths: paths,
        async createBackup(destination, verifyPublishedBackup) {
          assert.equal(destination, exportDirectory)
          await mkdir(directory)
          await writeFile(databaseFile, 'invalid')
          await writeFile(manifestFile, '{}')
          await verifyPublishedBackup(result)
          return result
        },
        async inspectBackup() {
          return undefined
        }
      }),
      /did not pass manifest, size, SHA-256, and integrity validation/
    )

    await assert.rejects(readdir(directory), { code: 'ENOENT' })
    assert.equal(await readFile(foreignFile, 'utf8'), 'foreign')
  })
})

test('returns cancellation without invoking the exporter and sanitizes destination errors', async () => {
  let exportCalls = 0
  const cancelled = createManualSqliteExportHandler(
    async () => undefined,
    async () => {
      exportCalls += 1
      throw new Error('must not run')
    }
  )
  assert.deepEqual(await cancelled(), { status: 'cancelled' })
  assert.equal(exportCalls, 0)

  const reported: unknown[] = []
  const rejected = createManualSqliteExportHandler(
    async () => 'D:\\active-data',
    async () => {
      throw new ManualSqliteExportDestinationError(
        'destination-not-allowed',
        'private destination detail'
      )
    },
    (error) => reported.push(error)
  )
  assert.deepEqual(await rejected(), {
    status: 'error',
    code: 'destination-not-allowed'
  })
  assert.equal(reported.length, 1)

  const failed = createManualSqliteExportHandler(
    async () => 'D:\\external',
    async () => {
      throw new Error('D:\\private\\secret.sqlite')
    }
  )
  const failedResult = await failed()
  assert.deepEqual(failedResult, { status: 'error', code: 'export-failed' })
  assert.equal(JSON.stringify(failedResult).includes('private'), false)
})

test('registers an argument-free IPC contract and rejects concurrent exports', async () => {
  const registrations: Array<{ channel: string; handler: ManualSqliteExportHandler }> = []
  let releaseSelection!: () => void
  const selectionPending = new Promise<void>((resolve) => {
    releaseSelection = resolve
  })

  registerManualSqliteExportIpc(
    (channel, handler) => registrations.push({ channel, handler }),
    async () => {
      await selectionPending
      return undefined
    }
  )

  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].channel, SQLITE_MANUAL_EXPORT_CHANNEL)
  const first = registrations[0].handler()
  assert.deepEqual(await registrations[0].handler(), {
    status: 'error',
    code: 'export-in-progress'
  })
  releaseSelection()
  assert.deepEqual(await first, { status: 'cancelled' })
})

test('returns only the generated directory name after a successful export', async () => {
  const directory = join('D:\\chosen-by-user', 'backup-safe')
  const handler = createManualSqliteExportHandler(
    async () => 'D:\\chosen-by-user',
    async (): Promise<SqliteBackupResult> => ({
      directory,
      databaseFile: join(directory, 'fatebound.sqlite'),
      manifestFile: join(directory, 'manifest.json'),
      manifest: {
        formatVersion: 2,
        application: 'fatebound',
        id: 'safe',
        createdAt: '2026-10-11T12:34:56.000Z',
        reason: 'manual',
        schemaVersion: 1,
        databaseFile: 'fatebound.sqlite',
        sizeBytes: 1,
        sha256: '0'.repeat(64)
      }
    })
  )

  const result = await handler()
  assert.deepEqual(result, { status: 'success', backupDirectoryName: basename(directory) })
  assert.equal(JSON.stringify(result).includes('chosen-by-user'), false)
})
