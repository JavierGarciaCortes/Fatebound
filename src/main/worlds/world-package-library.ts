import type {
  AvailableWorldPackage,
  WorldPackageCatalogReady
} from '../../shared/world-package-catalog.ts'
import type { FateworldValidationResult } from './fateworld-contract.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'
import { inspectWorldPackageCatalog } from './world-package-catalog.ts'
import { listActiveInstalledWorldVersions } from './world-installation-repository.ts'
import { inspectInstalledWorldStore } from './world-package-installed-store.ts'
import { createInstalledWorldArtworkUrls } from './world-package-artwork.ts'

export interface WorldPackageLibraryOptions {
  readonly listInstallations?: typeof listActiveInstalledWorldVersions
  readonly validatePackage?: (packagePath: string) => Promise<FateworldValidationResult>
}

function releaseKey(packageInfo: {
  readonly worldId: string
  readonly worldVersion: string
}): string {
  return `${packageInfo.worldId}\u0000${packageInfo.worldVersion}`
}

function sortPackages(
  left: AvailableWorldPackage,
  right: AvailableWorldPackage
): number {
  return (
    left.worldId.localeCompare(right.worldId, 'en') ||
    left.worldVersion.localeCompare(right.worldVersion, 'en', { numeric: true })
  )
}

export async function readWorldPackageLibraryCatalog(
  inboxDirectory: string,
  installedWorldsDirectory: string,
  options: WorldPackageLibraryOptions = {}
): Promise<WorldPackageCatalogReady> {
  const validatePackage = options.validatePackage ?? validateFateworldPackage
  const [available, records] = await Promise.all([
    inspectWorldPackageCatalog(inboxDirectory, { validatePackage }),
    (options.listInstallations ?? listActiveInstalledWorldVersions)()
  ])
  const installed = await inspectInstalledWorldStore(installedWorldsDirectory, records, {
    validatePackage
  })
  const packages = new Map(
    available.catalog.packages.map((packageInfo) => [releaseKey(packageInfo), packageInfo])
  )

  for (const entry of installed.entries) {
    const packageInfo: AvailableWorldPackage = Object.freeze({
      fileName: entry.fileName,
      worldId: entry.package.world.id,
      worldVersion: entry.package.world.version,
      titles: entry.package.world.titles,
      languages: entry.package.languages,
      defaultLanguage: entry.package.defaultLanguage,
      formatVersion: entry.package.formatVersion,
      installationStatus: 'installed',
      ...(entry.package.profile === 'basic'
        ? {
            artwork: createInstalledWorldArtworkUrls(
              entry.record.worldId,
              entry.record.worldVersion,
              entry.record.packageSha256
            )
          }
        : {}),
      playable: false
    })
    packages.set(releaseKey(packageInfo), packageInfo)
  }

  return Object.freeze({
    status: 'ready',
    packages: Object.freeze([...packages.values()].sort(sortPackages)),
    issues: Object.freeze([...available.catalog.issues, ...installed.issues]),
    scanLimitReached: available.catalog.scanLimitReached
  })
}
