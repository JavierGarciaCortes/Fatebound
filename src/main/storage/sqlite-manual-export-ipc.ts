import { basename } from 'node:path'
import {
  SQLITE_MANUAL_EXPORT_CHANNEL,
  type SqliteManualExportResult
} from '../../shared/sqlite-manual-export.ts'
import type { SqliteBackupResult } from './sqlite-backup.ts'
import {
  exportManualSqliteBackup,
  ManualSqliteExportDestinationError
} from './sqlite-manual-export.ts'

export type ManualSqliteExportDestinationSelector = () => Promise<string | undefined>
export type ManualSqliteExporter = (
  destinationDirectory: string
) => Promise<SqliteBackupResult>
export type ManualSqliteExportHandler = () => Promise<SqliteManualExportResult>
export type ManualSqliteExportIpcRegistrar = (
  channel: string,
  handler: ManualSqliteExportHandler
) => void

export function createManualSqliteExportHandler(
  selectDestination: ManualSqliteExportDestinationSelector,
  exportBackup: ManualSqliteExporter = exportManualSqliteBackup,
  onError: (error: unknown) => void = () => undefined
): ManualSqliteExportHandler {
  let exportInProgress = false

  return async () => {
    if (exportInProgress) {
      return Object.freeze({ status: 'error', code: 'export-in-progress' })
    }

    exportInProgress = true

    try {
      const destinationDirectory = await selectDestination()
      if (destinationDirectory === undefined) {
        return Object.freeze({ status: 'cancelled' })
      }

      const result = await exportBackup(destinationDirectory)
      return Object.freeze({
        status: 'success',
        backupDirectoryName: basename(result.directory)
      })
    } catch (error) {
      onError(error)
      return Object.freeze({
        status: 'error',
        code:
          error instanceof ManualSqliteExportDestinationError
            ? error.code
            : 'export-failed'
      })
    } finally {
      exportInProgress = false
    }
  }
}

export function registerManualSqliteExportIpc(
  registerHandler: ManualSqliteExportIpcRegistrar,
  selectDestination: ManualSqliteExportDestinationSelector,
  exportBackup: ManualSqliteExporter = exportManualSqliteBackup,
  onError: (error: unknown) => void = () => undefined
): void {
  registerHandler(
    SQLITE_MANUAL_EXPORT_CHANNEL,
    createManualSqliteExportHandler(selectDestination, exportBackup, onError)
  )
}
