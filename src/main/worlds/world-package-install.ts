import { constants as fsConstants } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import type {
  WorldPackageInstallErrorCode,
  WorldPackageInstallResult
} from '../../shared/world-package-install.ts'
import type { FateworldValidationResult } from './fateworld-contract.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'
import {
  inspectWorldPackageCatalog,
  type AvailableWorldPackageSource,
  type WorldPackageCatalogInspection
} from './world-package-catalog.ts'
import {
  readActiveInstalledWorldVersion,
  registerActiveInstalledWorldVersion,
  type InstalledWorldRegistrationResult,
  type InstalledWorldVersionRecord
} from './world-installation-repository.ts'
import {
  assertStableFateworldPackage,
  cleanupUnpublishedInstalledWorldSlot,
  createPreparedInstalledWorldSlot,
  inspectPublishedInstalledWorldSlot,
  inspectStableFateworldPackage,
  publishInstalledWorldSlot,
  syncInstalledWorldPackage,
  type InstalledWorldStoreOptions,
  type PreparedInstalledWorldSlot,
  type StableFateworldPackage
} from './world-package-installed-store.ts'

const WORLD_ID_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{1,98}[a-z0-9])$/
const WORLD_VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

export class WorldPackageInstallError extends Error {
  readonly code: WorldPackageInstallErrorCode

  constructor(code: WorldPackageInstallErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'WorldPackageInstallError'
    this.code = code
  }
}

export interface WorldPackageInstallOptions extends InstalledWorldStoreOptions {
  readonly validatePackage?: (packagePath: string) => Promise<FateworldValidationResult>
  readonly inspectCatalog?: (inboxDirectory: string) => Promise<WorldPackageCatalogInspection>
  readonly readInstallation?: (
    worldId: string,
    worldVersion: string
  ) => Promise<InstalledWorldVersionRecord | undefined>
  readonly registerInstallation?: (
    record: InstalledWorldVersionRecord
  ) => Promise<InstalledWorldRegistrationResult>
  readonly publishReady?: (readyPath: string) => Promise<void>
  readonly now?: () => Date
}

function validateReleaseIdentity(worldId: string, worldVersion: string): void {
  if (
    worldId.length > 100 ||
    !WORLD_ID_PATTERN.test(worldId) ||
    (!worldId.includes('.') && !worldId.includes('-')) ||
    worldVersion.length > 100 ||
    !WORLD_VERSION_PATTERN.test(worldVersion)
  ) {
    throw new WorldPackageInstallError(
      'package-unavailable',
      'The requested world release identity is invalid'
    )
  }
}

function findSource(
  inspection: WorldPackageCatalogInspection,
  worldId: string,
  worldVersion: string
): AvailableWorldPackageSource {
  if (inspection.catalog.scanLimitReached) {
    throw new WorldPackageInstallError(
      'storage-unavailable',
      'The package catalog reached its safe scan limit'
    )
  }
  const source = inspection.sources.find(
    (candidate) =>
      candidate.packageInfo.worldId === worldId &&
      candidate.packageInfo.worldVersion === worldVersion
  )
  if (source === undefined) {
    throw new WorldPackageInstallError(
      'package-unavailable',
      'The requested world release is not available in the validated catalog'
    )
  }
  return source
}

async function inspectAvailableSource(
  source: AvailableWorldPackageSource,
  worldId: string,
  worldVersion: string,
  validatePackage: (packagePath: string) => Promise<FateworldValidationResult>
): Promise<StableFateworldPackage> {
  try {
    const inspected = await inspectStableFateworldPackage(source.packagePath, validatePackage)
    if (
      inspected.realPath !== source.realPackagePath ||
      inspected.package.world.id !== worldId ||
      inspected.package.world.version !== worldVersion
    ) {
      throw new Error('Catalog source changed after selection')
    }
    return inspected
  } catch (error) {
    throw new WorldPackageInstallError(
      'package-changed',
      'The available package changed while it was being inspected',
      { cause: error }
    )
  }
}

function installationOutcome(
  status: 'success' | 'already-installed',
  worldId: string,
  worldVersion: string
): WorldPackageInstallResult {
  return Object.freeze({ status, worldId, worldVersion })
}

async function verifyExistingInstallation(
  worldsDirectory: string,
  existing: InstalledWorldVersionRecord,
  source: StableFateworldPackage,
  validatePackage: (packagePath: string) => Promise<FateworldValidationResult>
): Promise<WorldPackageInstallResult> {
  if (existing.packageSha256 !== source.sha256) {
    throw new WorldPackageInstallError(
      'version-conflict',
      'The installed world release has different package bytes'
    )
  }

  try {
    await inspectPublishedInstalledWorldSlot(worldsDirectory, existing, validatePackage)
  } catch (error) {
    throw new WorldPackageInstallError(
      'incomplete-installation',
      'SQLite references an installed package that is missing or invalid',
      { cause: error }
    )
  }

  return installationOutcome('already-installed', existing.worldId, existing.worldVersion)
}

function createRecord(
  source: StableFateworldPackage,
  slot: PreparedInstalledWorldSlot,
  installedAt: Date
): InstalledWorldVersionRecord {
  return Object.freeze({
    worldId: source.package.world.id,
    worldVersion: source.package.world.version,
    formatVersion: source.package.formatVersion,
    profile: source.package.profile,
    packageSha256: source.sha256,
    packageSizeBytes: source.contents.byteLength,
    storageSlotId: slot.id,
    installedAt: installedAt.toISOString()
  })
}

export async function installWorldPackage(
  worldId: string,
  worldVersion: string,
  inboxDirectory: string,
  installedWorldsDirectory: string,
  options: WorldPackageInstallOptions = {}
): Promise<WorldPackageInstallResult> {
  validateReleaseIdentity(worldId, worldVersion)
  const validatePackage = options.validatePackage ?? validateFateworldPackage
  const inspectCatalog = options.inspectCatalog ?? ((directory) => inspectWorldPackageCatalog(directory))
  const readInstallation = options.readInstallation ?? readActiveInstalledWorldVersion
  const registerInstallation =
    options.registerInstallation ?? registerActiveInstalledWorldVersion
  const publishReady = options.publishReady ?? publishInstalledWorldSlot
  let slot: PreparedInstalledWorldSlot | undefined

  try {
    const source = findSource(await inspectCatalog(inboxDirectory), worldId, worldVersion)
    const inspectedSource = await inspectAvailableSource(
      source,
      worldId,
      worldVersion,
      validatePackage
    )
    const existing = await readInstallation(worldId, worldVersion)
    if (existing !== undefined) {
      return await verifyExistingInstallation(
        installedWorldsDirectory,
        existing,
        inspectedSource,
        validatePackage
      )
    }

    try {
      slot = await createPreparedInstalledWorldSlot(installedWorldsDirectory, options)
      await copyFile(inspectedSource.path, slot.packagePath, fsConstants.COPYFILE_EXCL)
      await assertStableFateworldPackage(inspectedSource)
      await syncInstalledWorldPackage(slot.packagePath)
    } catch (error) {
      throw new WorldPackageInstallError(
        'copy-failed',
        'The installed package copy could not be prepared safely',
        { cause: error }
      )
    }

    const prepared = await inspectStableFateworldPackage(slot.packagePath, validatePackage)
    if (
      prepared.package.world.id !== worldId ||
      prepared.package.world.version !== worldVersion ||
      prepared.sha256 !== inspectedSource.sha256 ||
      prepared.contents.byteLength !== inspectedSource.contents.byteLength
    ) {
      throw new WorldPackageInstallError(
        'package-changed',
        'The managed package copy does not match the selected package'
      )
    }

    await assertStableFateworldPackage(inspectedSource)
    try {
      await publishReady(slot.readyPath)
    } catch (error) {
      throw new WorldPackageInstallError(
        'copy-failed',
        'The installed package copy could not be published safely',
        { cause: error }
      )
    }

    const record = createRecord(inspectedSource, slot, (options.now ?? (() => new Date()))())
    try {
      await inspectPublishedInstalledWorldSlot(
        installedWorldsDirectory,
        record,
        validatePackage
      )
    } catch (error) {
      throw new WorldPackageInstallError(
        'incomplete-installation',
        'The published installed package could not be verified',
        { cause: error }
      )
    }

    let registration: InstalledWorldRegistrationResult
    try {
      registration = await registerInstallation(record)
    } catch (error) {
      throw new WorldPackageInstallError(
        'database-unavailable',
        'The installed world could not be registered in SQLite',
        { cause: error }
      )
    }
    if (registration === 'conflict') {
      throw new WorldPackageInstallError(
        'version-conflict',
        'A different package is already registered for this world release'
      )
    }
    if (registration === 'identical') {
      const registered = await readInstallation(worldId, worldVersion)
      if (registered === undefined) {
        throw new WorldPackageInstallError(
          'database-unavailable',
          'The existing installed world registration could not be read'
        )
      }
      return await verifyExistingInstallation(
        installedWorldsDirectory,
        registered,
        inspectedSource,
        validatePackage
      )
    }

    try {
      await inspectPublishedInstalledWorldSlot(
        installedWorldsDirectory,
        record,
        validatePackage
      )
    } catch (error) {
      throw new WorldPackageInstallError(
        'incomplete-installation',
        'The installed package became unavailable after registration',
        { cause: error }
      )
    }
    return installationOutcome('success', worldId, worldVersion)
  } catch (error) {
    if (error instanceof WorldPackageInstallError) throw error
    throw new WorldPackageInstallError(
      'storage-unavailable',
      'The world installation could not be completed safely',
      { cause: error }
    )
  } finally {
    if (slot !== undefined) await cleanupUnpublishedInstalledWorldSlot(slot)
  }
}
