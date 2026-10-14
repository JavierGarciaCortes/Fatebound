export const WORLD_PACKAGE_ADD_CHANNEL = 'fatebound:worlds:add-package'

export type WorldPackageAddErrorCode =
  | 'invalid-package'
  | 'incompatible-package'
  | 'package-changed'
  | 'version-conflict'
  | 'destination-unavailable'
  | 'copy-failed'
  | 'add-in-progress'

export interface WorldPackageAddSuccess {
  readonly status: 'success'
  readonly worldId: string
  readonly worldVersion: string
}

export interface WorldPackageAlreadyAvailable {
  readonly status: 'already-available'
  readonly worldId: string
  readonly worldVersion: string
}

export interface WorldPackageAddCancellation {
  readonly status: 'cancelled'
}

export interface WorldPackageAddFailure {
  readonly status: 'error'
  readonly code: WorldPackageAddErrorCode
}

export type WorldPackageAddResult =
  | WorldPackageAddSuccess
  | WorldPackageAlreadyAvailable
  | WorldPackageAddCancellation
  | WorldPackageAddFailure
