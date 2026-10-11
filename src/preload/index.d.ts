import type { FateboundApi } from '../shared/fatebound-api.ts'

declare global {
  interface Window {
    api: FateboundApi
  }
}
