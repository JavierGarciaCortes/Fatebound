export const SQLITE_MANUAL_EXPORT_CHANNEL = 'fatebound:storage:export-sqlite-backup'

export type SqliteManualExportErrorCode =
  | 'destination-not-allowed'
  | 'destination-unavailable'
  | 'export-in-progress'
  | 'export-failed'

export type SqliteManualExportResult =
  | {
      readonly status: 'success'
      readonly backupDirectoryName: string
    }
  | { readonly status: 'cancelled' }
  | {
      readonly status: 'error'
      readonly code: SqliteManualExportErrorCode
    }
