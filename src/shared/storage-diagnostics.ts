export const STORAGE_DIAGNOSTICS_CHANNEL = 'fatebound:storage:get-diagnostics'

export interface StorageDiagnostics {
  readonly status: 'ready'
  readonly dataDirectory: string
  readonly databaseFile: string
  readonly sqliteStatus: 'available'
  readonly schemaVersion: number
  readonly integrityCheck: 'ok'
  readonly foreignKeyCheck: 'ok'
  readonly managedBackupCount: number
  readonly checkedAt: string
}

export interface StorageDiagnosticsFailure {
  readonly status: 'error'
  readonly code: 'diagnostics-unavailable'
}

export type StorageDiagnosticsResult = StorageDiagnostics | StorageDiagnosticsFailure
