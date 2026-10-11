import type { FateboundApi } from '../shared/storage-diagnostics.ts'

declare global {
  interface Window {
    api: FateboundApi
  }
}
