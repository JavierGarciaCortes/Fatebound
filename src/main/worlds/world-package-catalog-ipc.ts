import {
  WORLD_PACKAGE_CATALOG_CHANNEL,
  type WorldPackageCatalogReady,
  type WorldPackageCatalogResult
} from '../../shared/world-package-catalog.ts'

export type WorldPackageCatalogReader = () => Promise<WorldPackageCatalogReady>
export type WorldPackageCatalogHandler = () => Promise<WorldPackageCatalogResult>
export type WorldPackageCatalogIpcRegistrar = (
  channel: string,
  handler: WorldPackageCatalogHandler
) => void

export function createWorldPackageCatalogHandler(
  readCatalog: WorldPackageCatalogReader,
  onError: (error: unknown) => void = () => undefined
): WorldPackageCatalogHandler {
  return async () => {
    try {
      return await readCatalog()
    } catch (error) {
      onError(error)
      return { status: 'error', code: 'catalog-unavailable' }
    }
  }
}

export function registerWorldPackageCatalogIpc(
  registerHandler: WorldPackageCatalogIpcRegistrar,
  readCatalog: WorldPackageCatalogReader,
  onError: (error: unknown) => void = () => undefined
): void {
  registerHandler(
    WORLD_PACKAGE_CATALOG_CHANNEL,
    createWorldPackageCatalogHandler(readCatalog, onError)
  )
}
