import type {
  ApplicationLanguage,
  ApplicationLanguageReadResult,
  ApplicationLanguageWriteResult
} from './application-language.ts'
import type { StorageDiagnosticsResult } from './storage-diagnostics.ts'
import type { SqliteManualExportResult } from './sqlite-manual-export.ts'

export interface FateboundApi {
  readonly storage: {
    getDiagnostics(): Promise<StorageDiagnosticsResult>
    exportSqliteBackup(): Promise<SqliteManualExportResult>
  }
  readonly preferences: {
    getLanguage(): Promise<ApplicationLanguageReadResult>
    setLanguage(language: ApplicationLanguage): Promise<ApplicationLanguageWriteResult>
  }
}
