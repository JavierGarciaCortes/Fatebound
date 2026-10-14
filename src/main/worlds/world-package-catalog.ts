import type { Stats } from 'node:fs'
import { lstat, opendir, realpath } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import type {
  AvailableWorldPackage,
  WorldPackageCatalogIssue,
  WorldPackageCatalogReady
} from '../../shared/world-package-catalog.ts'
import type { FateworldValidationResult } from './fateworld-contract.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'

export const WORLD_PACKAGE_CATALOG_LIMITS = Object.freeze({
  maximumDirectoryEntries: 256,
  maximumPackages: 32
})

export interface WorldPackageCatalogOptions {
  readonly validatePackage?: (packagePath: string) => Promise<FateworldValidationResult>
}

interface CandidateInspection {
  readonly fileName: string
  readonly result:
    | { readonly valid: true; readonly package: AvailableWorldPackage }
    | { readonly valid: false; readonly issue: WorldPackageCatalogIssue }
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}

function isDirectChild(parentDirectory: string, candidatePath: string): boolean {
  const candidateRelativePath = relative(parentDirectory, candidatePath)
  return (
    candidateRelativePath.length > 0 &&
    !isAbsolute(candidateRelativePath) &&
    !candidateRelativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
    candidateRelativePath !== '..' &&
    dirname(candidateRelativePath) === '.'
  )
}

function sameFileSnapshot(before: Stats, after: Stats): boolean {
  return (
    before.dev === after.dev &&
    before.ino === after.ino &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs &&
    before.ctimeMs === after.ctimeMs
  )
}

function sourceIssue(
  fileName: string,
  validationCode: string,
  retryable: boolean
): CandidateInspection {
  return {
    fileName,
    result: {
      valid: false,
      issue: {
        kind: 'invalid',
        fileNames: [fileName],
        retryable,
        validationCode
      }
    }
  }
}

async function inspectCandidate(
  directory: string,
  realDirectory: string,
  fileName: string,
  validatePackage: (packagePath: string) => Promise<FateworldValidationResult>
): Promise<CandidateInspection> {
  const packagePath = join(directory, fileName)
  let before: Stats

  try {
    before = await lstat(packagePath)
    if (before.isSymbolicLink() || !before.isFile()) {
      return sourceIssue(fileName, 'SOURCE_NOT_REGULAR', false)
    }

    const realPackagePath = await realpath(packagePath)
    if (!isDirectChild(realDirectory, realPackagePath)) {
      return sourceIssue(fileName, 'SOURCE_OUTSIDE_DIRECTORY', false)
    }
  } catch {
    return sourceIssue(fileName, 'PACKAGE_UNREADABLE', true)
  }

  let validation: FateworldValidationResult
  try {
    validation = await validatePackage(packagePath)
  } catch {
    return sourceIssue(fileName, 'PACKAGE_UNREADABLE', true)
  }

  let after: Stats
  try {
    after = await lstat(packagePath)
  } catch {
    return sourceIssue(fileName, 'PACKAGE_CHANGED_DURING_SCAN', true)
  }

  if (after.isSymbolicLink() || !after.isFile() || !sameFileSnapshot(before, after)) {
    return sourceIssue(fileName, 'PACKAGE_CHANGED_DURING_SCAN', true)
  }

  if (!validation.valid) {
    const firstError = validation.errors[0]
    const incompatible =
      firstError?.code === 'UNSUPPORTED_FORMAT_VERSION' ||
      firstError?.code === 'UNSUPPORTED_CAPABILITY'
    const retryable =
      firstError?.code === 'PACKAGE_UNREADABLE' ||
      firstError?.code === 'INVALID_ZIP' ||
      firstError?.code === 'CHECKSUM_MISMATCH'

    return {
      fileName,
      result: {
        valid: false,
        issue: {
          kind: incompatible ? 'incompatible' : 'invalid',
          fileNames: [fileName],
          retryable,
          ...(firstError === undefined ? {} : { validationCode: firstError.code })
        }
      }
    }
  }

  return {
    fileName,
    result: {
      valid: true,
      package: {
        fileName,
        worldId: validation.package.world.id,
        worldVersion: validation.package.world.version,
        titles: validation.package.world.titles,
        languages: validation.package.languages,
        defaultLanguage: validation.package.defaultLanguage,
        formatVersion: validation.package.formatVersion,
        playable: false
      }
    }
  }
}

function releaseKey(packageInfo: AvailableWorldPackage): string {
  return `${packageInfo.worldId}\u0000${packageInfo.worldVersion}`
}

function sortPackages(
  left: AvailableWorldPackage,
  right: AvailableWorldPackage
): number {
  return (
    left.worldId.localeCompare(right.worldId, 'en') ||
    left.worldVersion.localeCompare(right.worldVersion, 'en', { numeric: true }) ||
    left.fileName.localeCompare(right.fileName, 'en')
  )
}

export async function readWorldPackageCatalog(
  inboxDirectory: string,
  options: WorldPackageCatalogOptions = {}
): Promise<WorldPackageCatalogReady> {
  const directory = resolve(inboxDirectory)
  let directoryStats: Stats

  try {
    directoryStats = await lstat(directory)
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return { status: 'ready', packages: [], issues: [], scanLimitReached: false }
    }
    throw error
  }

  if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
    throw new Error('The world package inbox is not a regular directory')
  }

  const realDirectory = await realpath(directory)
  const candidateNames: string[] = []
  let observedEntries = 0
  let scanLimitReached = false
  const handle = await opendir(directory)

  for await (const entry of handle) {
    observedEntries += 1
    if (observedEntries > WORLD_PACKAGE_CATALOG_LIMITS.maximumDirectoryEntries) {
      scanLimitReached = true
      break
    }
    if (extname(entry.name).toLowerCase() !== '.fateworld') continue
    if (candidateNames.length >= WORLD_PACKAGE_CATALOG_LIMITS.maximumPackages) {
      scanLimitReached = true
      continue
    }
    candidateNames.push(entry.name)
  }

  candidateNames.sort((left, right) => left.localeCompare(right, 'en'))
  const validatePackage = options.validatePackage ?? validateFateworldPackage
  const inspected: CandidateInspection[] = []

  for (const fileName of candidateNames) {
    inspected.push(await inspectCandidate(directory, realDirectory, fileName, validatePackage))
  }

  const issues = inspected
    .filter((candidate) => !candidate.result.valid)
    .map((candidate) => (candidate.result as { valid: false; issue: WorldPackageCatalogIssue }).issue)
  const candidatesByRelease = new Map<string, AvailableWorldPackage[]>()

  for (const candidate of inspected) {
    if (!candidate.result.valid) continue
    const key = releaseKey(candidate.result.package)
    const releaseCandidates = candidatesByRelease.get(key) ?? []
    releaseCandidates.push(candidate.result.package)
    candidatesByRelease.set(key, releaseCandidates)
  }

  const packages: AvailableWorldPackage[] = []
  for (const releaseCandidates of candidatesByRelease.values()) {
    if (releaseCandidates.length === 1) {
      packages.push(releaseCandidates[0])
      continue
    }

    const first = releaseCandidates[0]
    issues.push({
      kind: 'duplicate',
      fileNames: releaseCandidates.map((candidate) => candidate.fileName).sort(),
      retryable: false,
      validationCode: 'DUPLICATE_WORLD_RELEASE',
      worldId: first.worldId,
      worldVersion: first.worldVersion
    })
  }

  packages.sort(sortPackages)
  issues.sort((left, right) => left.fileNames[0].localeCompare(right.fileNames[0], 'en'))

  return {
    status: 'ready',
    packages,
    issues,
    scanLimitReached
  }
}
