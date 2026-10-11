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

export type IpcInvoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>

export function createFateboundApi(invoke: IpcInvoke): FateboundApi {
  return Object.freeze({
    storage: Object.freeze({
      async getDiagnostics(): Promise<StorageDiagnosticsResult> {
        return (await invoke(STORAGE_DIAGNOSTICS_CHANNEL)) as StorageDiagnosticsResult
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
    })
  })
}
