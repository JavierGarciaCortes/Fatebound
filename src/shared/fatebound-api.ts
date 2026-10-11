import type {
  ApplicationLanguage,
  ApplicationLanguageReadResult,
  ApplicationLanguageWriteResult
} from './application-language.ts'
import type { StorageDiagnosticsResult } from './storage-diagnostics.ts'

export interface FateboundApi {
  readonly storage: {
    getDiagnostics(): Promise<StorageDiagnosticsResult>
  }
  readonly preferences: {
    getLanguage(): Promise<ApplicationLanguageReadResult>
    setLanguage(language: ApplicationLanguage): Promise<ApplicationLanguageWriteResult>
  }
}
