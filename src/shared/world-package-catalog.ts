import type { WorldPackageArtworkUrls } from './world-package-artwork.ts'

export const WORLD_PACKAGE_CATALOG_CHANNEL = 'fatebound:worlds:get-package-catalog'

export const KNOWN_WORLD_PACKAGE_IDS = Object.freeze({
  ronin: 'com.fatebound.worlds.ronin',
  templario: 'com.fatebound.worlds.templario',
  ninja: 'com.fatebound.worlds.ninja',
  shaolin: 'com.fatebound.worlds.shaolin',
  robot: 'com.fatebound.worlds.robot',
  soldado: 'com.fatebound.worlds.soldado',
  naves: 'com.fatebound.worlds.naves',
  mundoplato: 'com.fatebound.worlds.mundoplato'
} as const)

export type KnownWorldPresentationId = keyof typeof KNOWN_WORLD_PACKAGE_IDS

export interface AvailableWorldPackage {
  readonly fileName: string
  readonly worldId: string
  readonly worldVersion: string
  readonly titles: Readonly<Record<string, string>>
  readonly languages: readonly string[]
  readonly defaultLanguage: string
  readonly formatVersion: '1'
  readonly installationStatus: 'available' | 'installed'
  readonly artwork?: WorldPackageArtworkUrls
  readonly playable: false
}

export type WorldPackageCatalogIssueKind =
  | 'invalid'
  | 'incompatible'
  | 'duplicate'
  | 'installation'

export interface WorldPackageCatalogIssue {
  readonly kind: WorldPackageCatalogIssueKind
  readonly fileNames: readonly string[]
  readonly retryable: boolean
  readonly validationCode?: string
  readonly worldId?: string
  readonly worldVersion?: string
}

export interface WorldPackageCatalogReady {
  readonly status: 'ready'
  readonly packages: readonly AvailableWorldPackage[]
  readonly issues: readonly WorldPackageCatalogIssue[]
  readonly scanLimitReached: boolean
}

export interface WorldPackageCatalogFailure {
  readonly status: 'error'
  readonly code: 'catalog-unavailable'
}

export type WorldPackageCatalogResult =
  | WorldPackageCatalogReady
  | WorldPackageCatalogFailure

export function resolveKnownWorldPresentationId(
  worldId: string
): KnownWorldPresentationId | undefined {
  return (Object.entries(KNOWN_WORLD_PACKAGE_IDS) as Array<
    readonly [KnownWorldPresentationId, string]
  >).find(([, candidateWorldId]) => candidateWorldId === worldId)?.[0]
}
