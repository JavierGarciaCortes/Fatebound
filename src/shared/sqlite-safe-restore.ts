export const SQLITE_RESTORE_SELECT_CHANNEL = 'fatebound:storage:select-sqlite-backup'
export const SQLITE_RESTORE_CONFIRM_CHANNEL = 'fatebound:storage:confirm-sqlite-restore'
export const SQLITE_RESTORE_CANCEL_CHANNEL = 'fatebound:storage:cancel-sqlite-restore'

export type SqliteRestoreBackupReason = 'pre-migration' | 'protected' | 'automatic' | 'manual'

export interface SqliteRestorePreview {
  readonly createdAt: string
  readonly reason: SqliteRestoreBackupReason
  readonly schemaVersion: number
  readonly sizeBytes: number
}

export type SqliteRestoreErrorCode =
  | 'invalid-backup'
  | 'incompatible-backup'
  | 'backup-changed'
  | 'selection-required'
  | 'restore-in-progress'
  | 'recovery-required'
  | 'restore-failed'

export type SqliteRestoreSelectionResult =
  | {
      readonly status: 'ready'
      readonly backup: SqliteRestorePreview
    }
  | { readonly status: 'cancelled' }
  | {
      readonly status: 'error'
      readonly code: SqliteRestoreErrorCode
    }

export type SqliteRestoreConfirmationResult =
  | { readonly status: 'success' }
  | {
      readonly status: 'error'
      readonly code: SqliteRestoreErrorCode
    }

export type SqliteRestoreCancellationResult =
  | { readonly status: 'cancelled' }
  | {
      readonly status: 'error'
      readonly code: 'restore-in-progress'
    }
