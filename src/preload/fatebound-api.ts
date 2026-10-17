import {
  STORAGE_DIAGNOSTICS_CHANNEL,
  type StorageDiagnosticsResult
} from '../shared/storage-diagnostics.ts'
import {
  GET_APPLICATION_LANGUAGE_CHANNEL,
  SET_APPLICATION_LANGUAGE_CHANNEL,
  isApplicationLanguage,
  type ApplicationLanguage,
  type ApplicationLanguageReadResult,
  type ApplicationLanguageWriteResult
} from '../shared/application-language.ts'
import type { FateboundApi } from '../shared/fatebound-api.ts'
import {
  SQLITE_MANUAL_EXPORT_CHANNEL,
  type SqliteManualExportResult
} from '../shared/sqlite-manual-export.ts'
import {
  SQLITE_RESTORE_CANCEL_CHANNEL,
  SQLITE_RESTORE_CONFIRM_CHANNEL,
  SQLITE_RESTORE_SELECT_CHANNEL,
  type SqliteRestoreCancellationResult,
  type SqliteRestoreConfirmationResult,
  type SqliteRestoreSelectionResult
} from '../shared/sqlite-safe-restore.ts'
import {
  WORLD_PACKAGE_CATALOG_CHANNEL,
  type WorldPackageCatalogResult
} from '../shared/world-package-catalog.ts'
import {
  WORLD_PACKAGE_ADD_CHANNEL,
  type WorldPackageAddResult
} from '../shared/world-package-add.ts'
import {
  WORLD_PACKAGE_INSTALL_CHANNEL,
  type WorldPackageInstallResult
} from '../shared/world-package-install.ts'

export type IpcInvoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>

export function createFateboundApi(invoke: IpcInvoke): FateboundApi {
  return Object.freeze({
    storage: Object.freeze({
      async getDiagnostics(): Promise<StorageDiagnosticsResult> {
        return (await invoke(STORAGE_DIAGNOSTICS_CHANNEL)) as StorageDiagnosticsResult
      },
      async exportSqliteBackup(): Promise<SqliteManualExportResult> {
        return (await invoke(SQLITE_MANUAL_EXPORT_CHANNEL)) as SqliteManualExportResult
      },
      async selectSqliteBackupForRestore(): Promise<SqliteRestoreSelectionResult> {
        return (await invoke(SQLITE_RESTORE_SELECT_CHANNEL)) as SqliteRestoreSelectionResult
      },
      async confirmSqliteBackupRestore(): Promise<SqliteRestoreConfirmationResult> {
        return (await invoke(SQLITE_RESTORE_CONFIRM_CHANNEL)) as SqliteRestoreConfirmationResult
      },
      async cancelSqliteBackupRestore(): Promise<SqliteRestoreCancellationResult> {
        return (await invoke(SQLITE_RESTORE_CANCEL_CHANNEL)) as SqliteRestoreCancellationResult
      }
    }),
    preferences: Object.freeze({
      async getLanguage(): Promise<ApplicationLanguageReadResult> {
        return (await invoke(GET_APPLICATION_LANGUAGE_CHANNEL)) as ApplicationLanguageReadResult
      },
      async setLanguage(language: ApplicationLanguage): Promise<ApplicationLanguageWriteResult> {
        if (!isApplicationLanguage(language)) {
          return { status: 'error', code: 'invalid-language' }
        }
        return (await invoke(
          SET_APPLICATION_LANGUAGE_CHANNEL,
          language
        )) as ApplicationLanguageWriteResult
      }
    }),
    worlds: Object.freeze({
      async getPackageCatalog(): Promise<WorldPackageCatalogResult> {
        return (await invoke(WORLD_PACKAGE_CATALOG_CHANNEL)) as WorldPackageCatalogResult
      },
      async addPackage(): Promise<WorldPackageAddResult> {
        return (await invoke(WORLD_PACKAGE_ADD_CHANNEL)) as WorldPackageAddResult
      },
      async installPackage(
        worldId: string,
        worldVersion: string
      ): Promise<WorldPackageInstallResult> {
        return (await invoke(
          WORLD_PACKAGE_INSTALL_CHANNEL,
          worldId,
          worldVersion
        )) as WorldPackageInstallResult
      }
    })
  })
}
