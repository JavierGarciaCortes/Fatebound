import { getActiveStoragePaths } from './portable-storage.ts'
import { listManagedSqliteBackups } from './sqlite-backup-retention.ts'
import { getActiveSqliteDiagnosticSnapshot } from './sqlite-storage.ts'
import type { StorageDiagnostics } from '../../shared/storage-diagnostics.ts'

export async function readStorageDiagnostics(
  now: () => Date = () => new Date()
): Promise<StorageDiagnostics> {
  const paths = getActiveStoragePaths()
  const [sqlite, managedBackups] = await Promise.all([
    getActiveSqliteDiagnosticSnapshot(),
    listManagedSqliteBackups(paths.backupsDirectory)
  ])

  return Object.freeze({
    status: 'ready',
    dataDirectory: paths.dataDirectory,
    databaseFile: paths.databaseFile,
    sqliteStatus: 'available',
    schemaVersion: sqlite.schemaVersion,
    integrityCheck: 'ok',
    foreignKeyCheck: 'ok',
    managedBackupCount: managedBackups.length,
    checkedAt: now().toISOString()
  })
}
