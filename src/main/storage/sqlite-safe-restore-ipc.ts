import {
  SQLITE_RESTORE_CANCEL_CHANNEL,
  SQLITE_RESTORE_CONFIRM_CHANNEL,
  SQLITE_RESTORE_SELECT_CHANNEL,
  type SqliteRestoreCancellationResult,
  type SqliteRestoreConfirmationResult,
  type SqliteRestoreErrorCode,
  type SqliteRestoreSelectionResult
} from '../../shared/sqlite-safe-restore.ts'
import {
  areSameRestorableSqliteBackup,
  inspectRestorableSqliteBackup,
  SafeSqliteRestoreError,
  type RestorableSqliteBackup
} from './sqlite-safe-restore.ts'
import { restoreActiveSqliteBackup } from './sqlite-storage.ts'

export type SqliteRestoreSourceSelector = () => Promise<string | undefined>
export type SqliteRestoreInspector = (directory: string) => Promise<RestorableSqliteBackup>
export type SqliteRestorer = (backup: RestorableSqliteBackup) => Promise<void>
export type SqliteRestoreSelectionHandler = () => Promise<SqliteRestoreSelectionResult>
export type SqliteRestoreConfirmationHandler = () => Promise<SqliteRestoreConfirmationResult>
export type SqliteRestoreCancellationHandler = () => Promise<SqliteRestoreCancellationResult>
export type SqliteRestoreIpcRegistrar = (
  channel: string,
  handler:
    | SqliteRestoreSelectionHandler
    | SqliteRestoreConfirmationHandler
    | SqliteRestoreCancellationHandler
) => void

export interface SqliteRestoreHandlers {
  readonly select: SqliteRestoreSelectionHandler
  readonly confirm: SqliteRestoreConfirmationHandler
  readonly cancel: SqliteRestoreCancellationHandler
}

function restoreFailureCode(error: unknown): SqliteRestoreErrorCode {
  if (!(error instanceof SafeSqliteRestoreError)) return 'restore-failed'
  if (error.code === 'backup-changed') return 'backup-changed'
  if (error.code === 'active-recovery-failed') return 'recovery-required'
  return 'restore-failed'
}

export function createSqliteRestoreHandlers(
  selectSource: SqliteRestoreSourceSelector,
  inspectBackup: SqliteRestoreInspector = inspectRestorableSqliteBackup,
  restoreBackup: SqliteRestorer = restoreActiveSqliteBackup,
  onError: (error: unknown) => void = () => undefined
): SqliteRestoreHandlers {
  let pendingSelection: RestorableSqliteBackup | undefined
  let operationInProgress = false

  return Object.freeze({
    async select(): Promise<SqliteRestoreSelectionResult> {
      if (operationInProgress) {
        return Object.freeze({ status: 'error', code: 'restore-in-progress' })
      }

      operationInProgress = true
      pendingSelection = undefined

      try {
        const sourceDirectory = await selectSource()
        if (sourceDirectory === undefined) {
          return Object.freeze({ status: 'cancelled' })
        }

        const selection = await inspectBackup(sourceDirectory)
        pendingSelection = selection
        return Object.freeze({ status: 'ready', backup: selection.preview })
      } catch (error) {
        onError(error)
        return Object.freeze({
          status: 'error',
          code:
            error instanceof SafeSqliteRestoreError && error.code === 'incompatible-backup'
              ? 'incompatible-backup'
              : 'invalid-backup'
        })
      } finally {
        operationInProgress = false
      }
    },

    async confirm(): Promise<SqliteRestoreConfirmationResult> {
      if (operationInProgress) {
        return Object.freeze({ status: 'error', code: 'restore-in-progress' })
      }
      if (!pendingSelection) {
        return Object.freeze({ status: 'error', code: 'selection-required' })
      }

      operationInProgress = true
      const selected = pendingSelection
      pendingSelection = undefined

      try {
        let revalidated: RestorableSqliteBackup
        try {
          revalidated = await inspectBackup(selected.entry.directory)
        } catch (error) {
          throw new SafeSqliteRestoreError(
            'backup-changed',
            'The selected SQLite backup changed before confirmation',
            { cause: error }
          )
        }

        if (!areSameRestorableSqliteBackup(selected, revalidated)) {
          throw new SafeSqliteRestoreError(
            'backup-changed',
            'The selected SQLite backup changed before confirmation'
          )
        }

        await restoreBackup(revalidated)
        return Object.freeze({ status: 'success' })
      } catch (error) {
        onError(error)
        return Object.freeze({
          status: 'error',
          code: restoreFailureCode(error)
        })
      } finally {
        operationInProgress = false
      }
    },

    async cancel(): Promise<SqliteRestoreCancellationResult> {
      if (operationInProgress) {
        return Object.freeze({ status: 'error', code: 'restore-in-progress' })
      }

      pendingSelection = undefined
      return Object.freeze({ status: 'cancelled' })
    }
  })
}

export function registerSqliteRestoreIpc(
  registerHandler: SqliteRestoreIpcRegistrar,
  selectSource: SqliteRestoreSourceSelector,
  inspectBackup: SqliteRestoreInspector = inspectRestorableSqliteBackup,
  restoreBackup: SqliteRestorer = restoreActiveSqliteBackup,
  onError: (error: unknown) => void = () => undefined
): void {
  const handlers = createSqliteRestoreHandlers(selectSource, inspectBackup, restoreBackup, onError)
  registerHandler(SQLITE_RESTORE_SELECT_CHANNEL, handlers.select)
  registerHandler(SQLITE_RESTORE_CONFIRM_CHANNEL, handlers.confirm)
  registerHandler(SQLITE_RESTORE_CANCEL_CHANNEL, handlers.cancel)
}
