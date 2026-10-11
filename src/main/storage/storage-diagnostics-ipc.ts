import {
  STORAGE_DIAGNOSTICS_CHANNEL,
  type StorageDiagnostics,
  type StorageDiagnosticsResult
} from '../../shared/storage-diagnostics.ts'
import { readStorageDiagnostics } from './storage-diagnostics.ts'

export type StorageDiagnosticsReader = () => Promise<StorageDiagnostics>
export type StorageDiagnosticsHandler = () => Promise<StorageDiagnosticsResult>
export type IpcHandlerRegistrar = (channel: string, handler: StorageDiagnosticsHandler) => void

const DIAGNOSTICS_ERROR_MESSAGE =
  'No se pudo completar el diagnóstico de almacenamiento. SQLite puede estar cerrándose o la unidad puede no estar disponible.'

export function createStorageDiagnosticsHandler(
  readDiagnostics: StorageDiagnosticsReader = readStorageDiagnostics,
  onError: (error: unknown) => void = () => undefined
): StorageDiagnosticsHandler {
  return async () => {
    try {
      return await readDiagnostics()
    } catch (error) {
      onError(error)
      return Object.freeze({
        status: 'error',
        code: 'diagnostics-unavailable',
        message: DIAGNOSTICS_ERROR_MESSAGE
      })
    }
  }
}

export function registerStorageDiagnosticsIpc(
  registerHandler: IpcHandlerRegistrar,
  readDiagnostics: StorageDiagnosticsReader = readStorageDiagnostics,
  onError: (error: unknown) => void = () => undefined
): void {
  registerHandler(
    STORAGE_DIAGNOSTICS_CHANNEL,
    createStorageDiagnosticsHandler(readDiagnostics, onError)
  )
}
