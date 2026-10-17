import {
  WORLD_PACKAGE_INSTALL_CHANNEL,
  type WorldPackageInstallResult
} from '../../shared/world-package-install.ts'
import { WorldPackageInstallError } from './world-package-install.ts'

export type WorldPackageInstaller = (
  worldId: string,
  worldVersion: string
) => Promise<WorldPackageInstallResult>
export type WorldPackageInstallHandler = (
  worldId: unknown,
  worldVersion: unknown
) => Promise<WorldPackageInstallResult>
export type WorldPackageInstallIpcRegistrar = (
  channel: string,
  handler: WorldPackageInstallHandler
) => void

export function createWorldPackageInstallHandler(
  installPackage: WorldPackageInstaller,
  onError: (error: unknown) => void = () => undefined
): WorldPackageInstallHandler {
  let installInProgress = false

  return async (worldId, worldVersion) => {
    if (installInProgress) {
      return Object.freeze({ status: 'error', code: 'install-in-progress' })
    }
    if (typeof worldId !== 'string' || typeof worldVersion !== 'string') {
      return Object.freeze({ status: 'error', code: 'package-unavailable' })
    }

    installInProgress = true
    try {
      return await installPackage(worldId, worldVersion)
    } catch (error) {
      onError(error)
      return Object.freeze({
        status: 'error',
        code:
          error instanceof WorldPackageInstallError
            ? error.code
            : 'storage-unavailable'
      })
    } finally {
      installInProgress = false
    }
  }
}

export function registerWorldPackageInstallIpc(
  registerHandler: WorldPackageInstallIpcRegistrar,
  installPackage: WorldPackageInstaller,
  onError: (error: unknown) => void = () => undefined
): void {
  registerHandler(
    WORLD_PACKAGE_INSTALL_CHANNEL,
    createWorldPackageInstallHandler(installPackage, onError)
  )
}
