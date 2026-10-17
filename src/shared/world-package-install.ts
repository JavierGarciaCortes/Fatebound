export const WORLD_PACKAGE_INSTALL_CHANNEL = 'fatebound:worlds:install-package'

export type WorldPackageInstallErrorCode =
  | 'package-unavailable'
  | 'package-changed'
  | 'version-conflict'
  | 'storage-unavailable'
  | 'copy-failed'
  | 'database-unavailable'
  | 'incomplete-installation'
  | 'install-in-progress'

export interface WorldPackageInstallSuccess {
  readonly status: 'success'
  readonly worldId: string
  readonly worldVersion: string
}

export interface WorldPackageAlreadyInstalled {
  readonly status: 'already-installed'
  readonly worldId: string
  readonly worldVersion: string
}

export interface WorldPackageInstallFailure {
  readonly status: 'error'
  readonly code: WorldPackageInstallErrorCode
}

export type WorldPackageInstallResult =
  | WorldPackageInstallSuccess
  | WorldPackageAlreadyInstalled
  | WorldPackageInstallFailure
