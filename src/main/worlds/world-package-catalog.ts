import { constants as fsConstants, type Dirent, type Stats } from 'node:fs'
import { lstat, open, opendir, readdir, realpath } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import type {
  AvailableWorldPackage,
  WorldPackageCatalogIssue,
  WorldPackageCatalogReady
} from '../../shared/world-package-catalog.ts'
import type { FateworldValidationResult } from './fateworld-contract.ts'
import {
  isManagedWorldSlotId,
  isManagedWorldOwnerContents,
  MANAGED_WORLD_OWNER_FILE_NAME,
  MANAGED_WORLD_READY_FILE_NAME,
  MANAGED_WORLD_STORE_DIRECTORY_NAME,
  managedWorldPackageFileName
} from './world-package-managed-store.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'

export const WORLD_PACKAGE_CATALOG_LIMITS = Object.freeze({
  maximumDirectoryEntries: 256,
  maximumPackages: 32
})

const MAXIMUM_OWNER_BYTES = 128
const MANAGED_STORE_ISSUE_NAME = 'managed-store'

export interface WorldPackageCatalogOptions {
  readonly validatePackage?: (packagePath: string) => Promise<FateworldValidationResult>
}

export interface AvailableWorldPackageSource {
  readonly packageInfo: AvailableWorldPackage
  readonly packagePath: string
  readonly realPackagePath: string
}

export interface WorldPackageCatalogInspection {
  readonly catalog: WorldPackageCatalogReady
  readonly sources: readonly AvailableWorldPackageSource[]
}

interface ScanBudget {
  observedEntries: number
  scanLimitReached: boolean
}

interface ManagedSlotSnapshot {
  readonly slotPath: string
  readonly realSlotPath: string
  readonly slotStats: Stats
  readonly ownerPath: string
  readonly ownerStats: Stats
  readonly readyPath: string
  readonly readyStats: Stats
  readonly ownerContents: string
  readonly expectedNames: readonly string[]
}

interface CatalogCandidate {
  readonly fileName: string
  readonly packagePath: string
  readonly realParentDirectory: string
  readonly managedSnapshot?: ManagedSlotSnapshot
}

interface CandidateInspection {
  readonly fileName: string
  readonly packagePath?: string
  readonly realPackagePath?: string
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

async function readDirectoryEntries(
  directory: string,
  budget: ScanBudget
): Promise<Dirent[]> {
  const entries: Dirent[] = []
  const handle = await opendir(directory)

  for await (const entry of handle) {
    budget.observedEntries += 1
    if (budget.observedEntries > WORLD_PACKAGE_CATALOG_LIMITS.maximumDirectoryEntries) {
      budget.scanLimitReached = true
      break
    }
    entries.push(entry)
  }

  return entries
}

async function readStableSmallFile(
  filePath: string,
  expected: Stats,
  maximumBytes: number
): Promise<string> {
  const noFollow = typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0
  const handle = await open(filePath, fsConstants.O_RDONLY | noFollow)

  try {
    const opened = await handle.stat()
    if (!opened.isFile() || !sameFileSnapshot(expected, opened) || opened.size > maximumBytes) {
      throw new Error('Managed metadata changed or exceeded its size limit')
    }

    const contents = Buffer.alloc(opened.size + 1)
    let offset = 0
    while (offset < contents.length) {
      const { bytesRead } = await handle.read(contents, offset, contents.length - offset, offset)
      if (bytesRead === 0) break
      offset += bytesRead
    }
    if (offset !== opened.size) throw new Error('Managed metadata changed while being read')
    return contents.subarray(0, offset).toString('utf8')
  } finally {
    await handle.close()
  }
}

async function inspectRegularDirectChild(
  parentPath: string,
  realParentPath: string,
  childPath: string
): Promise<{ readonly stats: Stats; readonly realPath: string }> {
  const stats = await lstat(childPath)
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error('Managed entry is not a regular file')
  }
  const realPath = await realpath(childPath)
  if (!isDirectChild(realParentPath, realPath) || !isDirectChild(parentPath, childPath)) {
    throw new Error('Managed entry escapes its slot')
  }
  return { stats, realPath }
}

async function verifyManagedSlotSnapshot(snapshot: ManagedSlotSnapshot): Promise<boolean> {
  try {
    const [slotStats, realSlotPath, owner, ready, names] = await Promise.all([
      lstat(snapshot.slotPath),
      realpath(snapshot.slotPath),
      inspectRegularDirectChild(snapshot.slotPath, snapshot.realSlotPath, snapshot.ownerPath),
      inspectRegularDirectChild(snapshot.slotPath, snapshot.realSlotPath, snapshot.readyPath),
      readdir(snapshot.slotPath)
    ])

    if (
      slotStats.isSymbolicLink() ||
      !slotStats.isDirectory() ||
      realSlotPath !== snapshot.realSlotPath ||
      !sameFileSnapshot(snapshot.slotStats, slotStats) ||
      !sameFileSnapshot(snapshot.ownerStats, owner.stats) ||
      !sameFileSnapshot(snapshot.readyStats, ready.stats) ||
      ready.stats.size !== 0 ||
      names.sort((left, right) => left.localeCompare(right, 'en')).join('\u0000') !==
        snapshot.expectedNames.join('\u0000')
    ) {
      return false
    }

    return (
      (await readStableSmallFile(snapshot.ownerPath, owner.stats, MAXIMUM_OWNER_BYTES)) ===
      snapshot.ownerContents
    )
  } catch {
    return false
  }
}

async function inspectCandidate(
  candidate: CatalogCandidate,
  validatePackage: (packagePath: string) => Promise<FateworldValidationResult>
): Promise<CandidateInspection> {
  let before: Stats
  let realPackagePath: string

  try {
    before = await lstat(candidate.packagePath)
    if (before.isSymbolicLink() || !before.isFile()) {
      return sourceIssue(candidate.fileName, 'SOURCE_NOT_REGULAR', false)
    }

    realPackagePath = await realpath(candidate.packagePath)
    if (!isDirectChild(candidate.realParentDirectory, realPackagePath)) {
      return sourceIssue(candidate.fileName, 'SOURCE_OUTSIDE_DIRECTORY', false)
    }
  } catch {
    return sourceIssue(candidate.fileName, 'PACKAGE_UNREADABLE', true)
  }

  let validation: FateworldValidationResult
  try {
    validation = await validatePackage(candidate.packagePath)
  } catch {
    return sourceIssue(candidate.fileName, 'PACKAGE_UNREADABLE', true)
  }

  let after: Stats
  try {
    after = await lstat(candidate.packagePath)
  } catch {
    return sourceIssue(candidate.fileName, 'PACKAGE_CHANGED_DURING_SCAN', true)
  }

  if (
    after.isSymbolicLink() ||
    !after.isFile() ||
    !sameFileSnapshot(before, after) ||
    (candidate.managedSnapshot !== undefined &&
      !(await verifyManagedSlotSnapshot(candidate.managedSnapshot)))
  ) {
    return sourceIssue(candidate.fileName, 'PACKAGE_CHANGED_DURING_SCAN', true)
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
      fileName: candidate.fileName,
      result: {
        valid: false,
        issue: {
          kind: incompatible ? 'incompatible' : 'invalid',
          fileNames: [candidate.fileName],
          retryable,
          ...(firstError === undefined ? {} : { validationCode: firstError.code })
        }
      }
    }
  }

  return {
    fileName: candidate.fileName,
    packagePath: candidate.packagePath,
    realPackagePath,
    result: {
      valid: true,
      package: {
        fileName: candidate.fileName,
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

async function discoverManagedCandidate(
  managedDirectory: string,
  realManagedDirectory: string,
  slotId: string,
  budget: ScanBudget
): Promise<CatalogCandidate | CandidateInspection | undefined> {
  const fileName = managedWorldPackageFileName(slotId)
  const slotPath = join(managedDirectory, slotId)

  try {
    const slotStats = await lstat(slotPath)
    if (slotStats.isSymbolicLink() || !slotStats.isDirectory()) {
      return sourceIssue(fileName, 'MANAGED_SLOT_NOT_REGULAR', false)
    }
    const realSlotPath = await realpath(slotPath)
    if (!isDirectChild(realManagedDirectory, realSlotPath)) {
      return sourceIssue(fileName, 'MANAGED_SLOT_OUTSIDE_STORE', false)
    }

    const entries = await readDirectoryEntries(slotPath, budget)
    const names = entries.map((entry) => entry.name)
    if (!names.includes(MANAGED_WORLD_READY_FILE_NAME)) return undefined

    const expectedNames = [
      MANAGED_WORLD_OWNER_FILE_NAME,
      MANAGED_WORLD_READY_FILE_NAME,
      fileName
    ].sort((left, right) => left.localeCompare(right, 'en'))
    const sortedNames = [...names].sort((left, right) => left.localeCompare(right, 'en'))
    if (
      sortedNames.length !== expectedNames.length ||
      sortedNames.join('\u0000') !== expectedNames.join('\u0000')
    ) {
      return sourceIssue(fileName, 'MANAGED_SLOT_UNEXPECTED_STRUCTURE', false)
    }

    const ownerPath = join(slotPath, MANAGED_WORLD_OWNER_FILE_NAME)
    const readyPath = join(slotPath, MANAGED_WORLD_READY_FILE_NAME)
    const packagePath = join(slotPath, fileName)
    const [owner, ready] = await Promise.all([
      inspectRegularDirectChild(slotPath, realSlotPath, ownerPath),
      inspectRegularDirectChild(slotPath, realSlotPath, readyPath),
      inspectRegularDirectChild(slotPath, realSlotPath, packagePath)
    ])
    if (ready.stats.size !== 0) {
      return sourceIssue(fileName, 'MANAGED_READY_INVALID', false)
    }

    const ownerContents = await readStableSmallFile(
      ownerPath,
      owner.stats,
      MAXIMUM_OWNER_BYTES
    )
    if (!isManagedWorldOwnerContents(ownerContents, slotId)) {
      return sourceIssue(fileName, 'MANAGED_OWNER_INVALID', false)
    }

    return {
      fileName,
      packagePath,
      realParentDirectory: realSlotPath,
      managedSnapshot: {
        slotPath,
        realSlotPath,
        slotStats,
        ownerPath,
        ownerStats: owner.stats,
        readyPath,
        readyStats: ready.stats,
        ownerContents,
        expectedNames
      }
    }
  } catch {
    return sourceIssue(fileName, 'MANAGED_SLOT_UNREADABLE', true)
  }
}

async function discoverCandidates(
  directory: string,
  realDirectory: string,
  budget: ScanBudget
): Promise<{ readonly candidates: CatalogCandidate[]; readonly issues: CandidateInspection[] }> {
  const candidates: CatalogCandidate[] = []
  const issues: CandidateInspection[] = []
  const entries = await readDirectoryEntries(directory, budget)
  const directNames = entries
    .filter((entry) => extname(entry.name).toLowerCase() === '.fateworld')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'))

  for (const fileName of directNames) {
    if (candidates.length >= WORLD_PACKAGE_CATALOG_LIMITS.maximumPackages) {
      budget.scanLimitReached = true
      break
    }
    candidates.push({
      fileName,
      packagePath: join(directory, fileName),
      realParentDirectory: realDirectory
    })
  }

  if (
    budget.scanLimitReached ||
    !entries.some((entry) => entry.name === MANAGED_WORLD_STORE_DIRECTORY_NAME)
  ) {
    return { candidates, issues }
  }

  const managedDirectory = join(directory, MANAGED_WORLD_STORE_DIRECTORY_NAME)
  let realManagedDirectory: string
  try {
    const managedStats = await lstat(managedDirectory)
    if (managedStats.isSymbolicLink() || !managedStats.isDirectory()) {
      issues.push(sourceIssue(MANAGED_STORE_ISSUE_NAME, 'MANAGED_STORE_NOT_REGULAR', false))
      return { candidates, issues }
    }
    realManagedDirectory = await realpath(managedDirectory)
    if (!isDirectChild(realDirectory, realManagedDirectory)) {
      issues.push(sourceIssue(MANAGED_STORE_ISSUE_NAME, 'MANAGED_STORE_OUTSIDE_INBOX', false))
      return { candidates, issues }
    }
  } catch {
    issues.push(sourceIssue(MANAGED_STORE_ISSUE_NAME, 'MANAGED_STORE_UNREADABLE', true))
    return { candidates, issues }
  }

  let managedEntries: Dirent[]
  try {
    managedEntries = await readDirectoryEntries(managedDirectory, budget)
  } catch {
    issues.push(sourceIssue(MANAGED_STORE_ISSUE_NAME, 'MANAGED_STORE_UNREADABLE', true))
    return { candidates, issues }
  }

  let unexpectedEntryFound = false
  for (const entry of managedEntries.sort((left, right) =>
    left.name.localeCompare(right.name, 'en')
  )) {
    if (!isManagedWorldSlotId(entry.name)) {
      unexpectedEntryFound = true
      continue
    }
    if (candidates.length >= WORLD_PACKAGE_CATALOG_LIMITS.maximumPackages) {
      budget.scanLimitReached = true
      break
    }

    const discovered = await discoverManagedCandidate(
      managedDirectory,
      realManagedDirectory,
      entry.name,
      budget
    )
    if (discovered === undefined) continue
    if ('result' in discovered) issues.push(discovered)
    else candidates.push(discovered)
    if (budget.scanLimitReached) break
  }

  if (unexpectedEntryFound) {
    issues.push(sourceIssue(MANAGED_STORE_ISSUE_NAME, 'MANAGED_STORE_UNEXPECTED_STRUCTURE', false))
  }
  return { candidates, issues }
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

export async function inspectWorldPackageCatalog(
  inboxDirectory: string,
  options: WorldPackageCatalogOptions = {}
): Promise<WorldPackageCatalogInspection> {
  const directory = resolve(inboxDirectory)
  let directoryStats: Stats

  try {
    directoryStats = await lstat(directory)
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return {
        catalog: { status: 'ready', packages: [], issues: [], scanLimitReached: false },
        sources: []
      }
    }
    throw error
  }

  if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
    throw new Error('The world package inbox is not a regular directory')
  }

  const realDirectory = await realpath(directory)
  const budget: ScanBudget = { observedEntries: 0, scanLimitReached: false }
  const discovered = await discoverCandidates(directory, realDirectory, budget)
  const validatePackage = options.validatePackage ?? validateFateworldPackage
  const inspected: CandidateInspection[] = [...discovered.issues]

  for (const candidate of discovered.candidates) {
    inspected.push(await inspectCandidate(candidate, validatePackage))
  }

  const issues = inspected
    .filter((candidate) => !candidate.result.valid)
    .map(
      (candidate) =>
        (candidate.result as { valid: false; issue: WorldPackageCatalogIssue }).issue
    )
  const candidatesByRelease = new Map<string, CandidateInspection[]>()

  for (const candidate of inspected) {
    if (!candidate.result.valid) continue
    const key = releaseKey(candidate.result.package)
    const releaseCandidates = candidatesByRelease.get(key) ?? []
    releaseCandidates.push(candidate)
    candidatesByRelease.set(key, releaseCandidates)
  }

  const packages: AvailableWorldPackage[] = []
  const sources: AvailableWorldPackageSource[] = []
  for (const releaseCandidates of candidatesByRelease.values()) {
    if (releaseCandidates.length === 1) {
      const candidate = releaseCandidates[0]
      if (
        candidate.result.valid &&
        candidate.packagePath !== undefined &&
        candidate.realPackagePath !== undefined
      ) {
        packages.push(candidate.result.package)
        sources.push({
          packageInfo: candidate.result.package,
          packagePath: candidate.packagePath,
          realPackagePath: candidate.realPackagePath
        })
      }
      continue
    }

    const first = releaseCandidates[0]
    if (!first.result.valid) continue
    issues.push({
      kind: 'duplicate',
      fileNames: releaseCandidates.map((candidate) => candidate.fileName).sort(),
      retryable: false,
      validationCode: 'DUPLICATE_WORLD_RELEASE',
      worldId: first.result.package.worldId,
      worldVersion: first.result.package.worldVersion
    })
  }

  packages.sort(sortPackages)
  sources.sort((left, right) => sortPackages(left.packageInfo, right.packageInfo))
  issues.sort((left, right) => left.fileNames[0].localeCompare(right.fileNames[0], 'en'))

  return {
    catalog: {
      status: 'ready',
      packages,
      issues,
      scanLimitReached: budget.scanLimitReached
    },
    sources
  }
}

export async function readWorldPackageCatalog(
  inboxDirectory: string,
  options: WorldPackageCatalogOptions = {}
): Promise<WorldPackageCatalogReady> {
  return (await inspectWorldPackageCatalog(inboxDirectory, options)).catalog
}
