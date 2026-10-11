import {
  STORAGE_DIAGNOSTICS_CHANNEL,
  type FateboundApi,
  type StorageDiagnosticsResult
} from '../shared/storage-diagnostics.ts'

export type IpcInvoke = (channel: string) => Promise<unknown>

export function createFateboundApi(invoke: IpcInvoke): FateboundApi {
  return Object.freeze({
    storage: Object.freeze({
      async getDiagnostics(): Promise<StorageDiagnosticsResult> {
        return (await invoke(STORAGE_DIAGNOSTICS_CHANNEL)) as StorageDiagnosticsResult
      }
    })
  })
}
