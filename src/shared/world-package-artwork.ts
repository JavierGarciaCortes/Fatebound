export const WORLD_PACKAGE_ARTWORK_SCHEME = 'fatebound-world-artwork'

export type WorldPackageArtworkRole = 'hero' | 'card' | 'emblem'

export type WorldPackageArtworkUrls = Readonly<Record<WorldPackageArtworkRole, string>>
