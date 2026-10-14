import type {
  ApplicationLanguage,
  ApplicationLanguageReadResult,
  ApplicationLanguageWriteResult
} from './application-language.ts'
import type { StorageDiagnosticsResult } from './storage-diagnostics.ts'
import type { SqliteManualExportResult } from './sqlite-manual-export.ts'
import type {
  SqliteRestoreCancellationResult,
  SqliteRestoreConfirmationResult,
  SqliteRestoreSelectionResult
} from './sqlite-safe-restore.ts'
import type { WorldPackageCatalogResult } from './world-package-catalog.ts'

export interface FateboundApi {
  readonly storage: {
    getDiagnostics(): Promise<StorageDiagnosticsResult>
    exportSqliteBackup(): Promise<SqliteManualExportResult>
    selectSqliteBackupForRestore(): Promise<SqliteRestoreSelectionResult>
    confirmSqliteBackupRestore(): Promise<SqliteRestoreConfirmationResult>
    cancelSqliteBackupRestore(): Promise<SqliteRestoreCancellationResult>
  }
  readonly preferences: {
    getLanguage(): Promise<ApplicationLanguageReadResult>
    setLanguage(language: ApplicationLanguage): Promise<ApplicationLanguageWriteResult>
  }
  readonly worlds: {
    getPackageCatalog(): Promise<WorldPackageCatalogResult>
  }
}
