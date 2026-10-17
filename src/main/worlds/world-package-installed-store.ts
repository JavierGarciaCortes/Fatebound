import { createHash, randomUUID } from 'node:crypto'
import { constants as fsConstants, type Stats } from 'node:fs'
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rm
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { WorldPackageCatalogIssue } from '../../shared/world-package-catalog.ts'
import {
  FATEWORLD_LIMITS,
  type FateworldPackageInfo,
  type FateworldValidationResult
} from './fateworld-contract.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'
import type { InstalledWorldVersionRecord } from './world-installation-repository.ts'

export const INSTALLED_WORLD_STORE_DIRECTORY_NAME = '.fatebound-installed-v1'
export const INSTALLED_WORLD_OWNER_FILE_NAME = 'owner'
export const INSTALLED_WORLD_PACKAGE_FILE_NAME = 'package.fateworld'
export const INSTALLED_WORLD_READY_FILE_NAME = 'ready'

const MAXIMUM_OWNER_BYTES = 128
const MAXIMUM_INSTALLED_SLOTS = 128
const INSTALLED_WORLD_SLOT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export interface StableFateworldPackage {
  readonly path: string
  readonly realPath: string
  readonly snapshot: Stats
  readonly contents: Buffer
  readonly sha256: string
  readonly package: FateworldPackageInfo
}

export interface PreparedInstalledWorldSlot {
  readonly id: string
  readonly storePath: string
  readonly realStorePath: string
  readonly path: string
  readonly realPath: string
  readonly ownerPath: string
  readonly ownerContents: string
  readonly packagePath: string
  readonly readyPath: string
}

export interface InstalledWorldStoreEntry {
  readonly record: InstalledWorldVersionRecord
  readonly package: FateworldPackageInfo
  readonly fileName: string
  readonly packagePath: string
  readonly realPackagePath: string
  readonly packageSnapshot: Stats
  readonly packageContents: Buffer
  readonly slotPath: string
  readonly realSlotPath: string
  readonly ownerContents: string
}

export interface InstalledWorldStoreInspection {
  readonly entries: readonly InstalledWorldStoreEntry[]
  readonly issues: readonly WorldPackageCatalogIssue[]
}

export interface InstalledWorldStoreOptions {
  readonly validatePackage?: (packagePath: string) => Promise<FateworldValidationResult>
  readonly tokenFactory?: () => string
  readonly ownerTokenFactory?: () => string
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === code
}

function isUnsupportedSyncError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ['EINVAL', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP'].includes(
      (error as NodeJS.ErrnoException).code ?? ''
    )
  )
}

function isDirectChild(parentDirectory: string, candidatePath: string): boolean {
  const candidateRelativePath = relative(parentDirectory, candidatePath)
  return (
    candidateRelativePath.length > 0 &&
    !isAbsolute(candidateRelativePath) &&
    candidateRelativePath !== '..' &&
    !candidateRelativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
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

function sha256(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex')
}

export function isInstalledWorldSlotId(value: string): boolean {
  return INSTALLED_WORLD_SLOT_PATTERN.test(value)
}

function installedWorldOwnerContents(slotId: string, ownerId: string): string {
  return `fatebound-installed-world-v1\nslot=${slotId}\nowner=${ownerId}\n`
}

function isInstalledWorldOwnerContents(contents: string, slotId: string): boolean {
  const lines = contents.split('\n')
  return (
    lines.length === 4 &&
    lines[0] === 'fatebound-installed-world-v1' &&
    lines[1] === `slot=${slotId}` &&
    lines[2]?.startsWith('owner=') === true &&
    isInstalledWorldSlotId(lines[2].slice('owner='.length)) &&
    lines[3] === ''
  )
}

async function syncHandleWhenSupported(handle: Awaited<ReturnType<typeof open>>): Promise<void> {
  try {
    await handle.sync()
  } catch (error) {
    if (!isUnsupportedSyncError(error)) throw error
  }
}

async function readStableFile(filePath: string, expected: Stats): Promise<Buffer> {
  const noFollow = typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0
  const handle = await open(filePath, fsConstants.O_RDONLY | noFollow)

  try {
    const opened = await handle.stat()
    if (
      !opened.isFile() ||
      !sameFileSnapshot(expected, opened) ||
      opened.size > FATEWORLD_LIMITS.maximumArchiveBytes
    ) {
      throw new Error('Package changed or exceeded its compressed size limit')
    }

    const contents = Buffer.alloc(opened.size + 1)
    let offset = 0
    while (offset < contents.length) {
      const { bytesRead } = await handle.read(contents, offset, contents.length - offset, offset)
      if (bytesRead === 0) break
      offset += bytesRead
    }
    if (offset !== opened.size) throw new Error('Package changed while being read')
    return contents.subarray(0, offset)
  } finally {
    await handle.close()
  }
}

async function readStableSmallFile(
  filePath: string,
  expected: Stats,
  maximumBytes: number
): Promise<string> {
  const contents = await readStableFile(filePath, expected)
  if (contents.byteLength > maximumBytes) throw new Error('Metadata exceeds its size limit')
  return contents.toString('utf8')
}

export async function inspectStableFateworldPackage(
  packagePath: string,
  validatePackage: (packagePath: string) => Promise<FateworldValidationResult> =
    validateFateworldPackage
): Promise<StableFateworldPackage> {
  const resolvedPath = resolve(packagePath)
  const before = await lstat(resolvedPath)
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error('Package is not a regular file')
  }

  const realPackagePath = await realpath(resolvedPath)
  const validation = await validatePackage(resolvedPath)
  if (!validation.valid) throw new Error('Package failed Fateworld validation')

  const contents = await readStableFile(resolvedPath, before)
  const after = await lstat(resolvedPath)
  if (after.isSymbolicLink() || !after.isFile() || !sameFileSnapshot(before, after)) {
    throw new Error('Package changed during validation')
  }

  return Object.freeze({
    path: resolvedPath,
    realPath: realPackagePath,
    snapshot: after,
    contents,
    sha256: sha256(contents),
    package: validation.package
  })
}

export async function assertStableFateworldPackage(
  inspected: StableFateworldPackage
): Promise<void> {
  const after = await lstat(inspected.path)
  if (after.isSymbolicLink() || !after.isFile() || !sameFileSnapshot(inspected.snapshot, after)) {
    throw new Error('Package changed after validation')
  }
}

async function prepareStoreDirectory(worldsDirectory: string): Promise<{
  readonly path: string
  readonly realPath: string
}> {
  const worldsPath = resolve(worldsDirectory)
  await mkdir(worldsPath, { recursive: true })
  const worldsStats = await lstat(worldsPath)
  if (worldsStats.isSymbolicLink() || !worldsStats.isDirectory()) {
    throw new Error('The installed worlds directory is unsafe')
  }
  const realWorldsPath = await realpath(worldsPath)
  const storePath = join(worldsPath, INSTALLED_WORLD_STORE_DIRECTORY_NAME)
  try {
    await mkdir(storePath)
  } catch (error) {
    if (!isNodeErrorWithCode(error, 'EEXIST')) throw error
  }
  const storeStats = await lstat(storePath)
  const realStorePath = await realpath(storePath)
  if (
    storeStats.isSymbolicLink() ||
    !storeStats.isDirectory() ||
    !isDirectChild(realWorldsPath, realStorePath)
  ) {
    throw new Error('The installed world store is unsafe')
  }
  return { path: storePath, realPath: realStorePath }
}

async function writeOwnerMarker(path: string, contents: string): Promise<void> {
  const handle = await open(path, 'wx', 0o600)
  try {
    await handle.writeFile(contents, { encoding: 'utf8' })
    await syncHandleWhenSupported(handle)
  } finally {
    await handle.close()
  }
}

export async function createPreparedInstalledWorldSlot(
  worldsDirectory: string,
  options: InstalledWorldStoreOptions = {}
): Promise<PreparedInstalledWorldSlot> {
  const store = await prepareStoreDirectory(worldsDirectory)
  const slotId = (options.tokenFactory ?? randomUUID)()
  const ownerId = (options.ownerTokenFactory ?? randomUUID)()
  if (!isInstalledWorldSlotId(slotId) || !isInstalledWorldSlotId(ownerId)) {
    throw new Error('Generated installed world ownership identifiers are invalid')
  }

  const slotPath = join(store.path, slotId)
  await mkdir(slotPath)
  const slotStats = await lstat(slotPath)
  const realSlotPath = await realpath(slotPath)
  if (
    slotStats.isSymbolicLink() ||
    !slotStats.isDirectory() ||
    !isDirectChild(store.realPath, realSlotPath)
  ) {
    throw new Error('The installed world slot is unsafe')
  }

  const ownerContents = installedWorldOwnerContents(slotId, ownerId)
  const ownerPath = join(slotPath, INSTALLED_WORLD_OWNER_FILE_NAME)
  await writeOwnerMarker(ownerPath, ownerContents)
  return Object.freeze({
    id: slotId,
    storePath: store.path,
    realStorePath: store.realPath,
    path: slotPath,
    realPath: realSlotPath,
    ownerPath,
    ownerContents,
    packagePath: join(slotPath, INSTALLED_WORLD_PACKAGE_FILE_NAME),
    readyPath: join(slotPath, INSTALLED_WORLD_READY_FILE_NAME)
  })
}

export async function syncInstalledWorldPackage(packagePath: string): Promise<void> {
  const noFollow = typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0
  const handle = await open(packagePath, fsConstants.O_RDWR | noFollow)
  try {
    if (!(await handle.stat()).isFile()) throw new Error('Installed package is not regular')
    await syncHandleWhenSupported(handle)
  } finally {
    await handle.close()
  }
}

export async function publishInstalledWorldSlot(readyPath: string): Promise<void> {
  const handle = await open(readyPath, 'wx', 0o600)
  try {
    await syncHandleWhenSupported(handle)
  } finally {
    await handle.close()
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) return false
    return true
  }
}

export async function cleanupUnpublishedInstalledWorldSlot(
  slot: PreparedInstalledWorldSlot
): Promise<void> {
  try {
    if (await pathExists(slot.readyPath)) return
    const [slotStats, realSlotPath, ownerStats, names] = await Promise.all([
      lstat(slot.path),
      realpath(slot.path),
      lstat(slot.ownerPath),
      readdir(slot.path)
    ])
    if (
      slotStats.isSymbolicLink() ||
      !slotStats.isDirectory() ||
      realSlotPath !== slot.realPath ||
      !isDirectChild(slot.realStorePath, realSlotPath) ||
      ownerStats.isSymbolicLink() ||
      !ownerStats.isFile() ||
      (await readStableSmallFile(slot.ownerPath, ownerStats, MAXIMUM_OWNER_BYTES)) !==
        slot.ownerContents ||
      names.some(
        (name) =>
          name !== INSTALLED_WORLD_OWNER_FILE_NAME &&
          name !== INSTALLED_WORLD_PACKAGE_FILE_NAME
      )
    ) {
      return
    }
    if (await pathExists(slot.readyPath)) return
    await rm(slot.path, { recursive: true, force: false })
  } catch {
    // Anything no longer attributable to this unpublished operation is preserved.
  }
}

function installationIssue(
  label: string,
  validationCode: string,
  record?: InstalledWorldVersionRecord
): WorldPackageCatalogIssue {
  return Object.freeze({
    kind: 'installation',
    fileNames: [label],
    retryable: false,
    validationCode,
    ...(record === undefined
      ? {}
      : { worldId: record.worldId, worldVersion: record.worldVersion })
  })
}

export async function inspectPublishedInstalledWorldSlot(
  worldsDirectory: string,
  record: InstalledWorldVersionRecord,
  validatePackage: (packagePath: string) => Promise<FateworldValidationResult> =
    validateFateworldPackage
): Promise<InstalledWorldStoreEntry> {
  if (!isInstalledWorldSlotId(record.storageSlotId)) {
    throw new Error('Installed world record has an invalid slot identifier')
  }

  const worldsPath = resolve(worldsDirectory)
  const storePath = join(worldsPath, INSTALLED_WORLD_STORE_DIRECTORY_NAME)
  const slotPath = join(storePath, record.storageSlotId)
  const [worldsStats, realWorldsPath, storeStats, realStorePath, slotStats, realSlotPath, names] = await Promise.all([
    lstat(worldsPath),
    realpath(worldsPath),
    lstat(storePath),
    realpath(storePath),
    lstat(slotPath),
    realpath(slotPath),
    readdir(slotPath)
  ])
  if (
    worldsStats.isSymbolicLink() ||
    !worldsStats.isDirectory() ||
    storeStats.isSymbolicLink() ||
    !storeStats.isDirectory() ||
    !isDirectChild(realWorldsPath, realStorePath) ||
    slotStats.isSymbolicLink() ||
    !slotStats.isDirectory() ||
    !isDirectChild(realStorePath, realSlotPath)
  ) {
    throw new Error('Installed world slot is unsafe')
  }

  const expectedNames = [
    INSTALLED_WORLD_OWNER_FILE_NAME,
    INSTALLED_WORLD_PACKAGE_FILE_NAME,
    INSTALLED_WORLD_READY_FILE_NAME
  ].sort()
  if ([...names].sort().join('\u0000') !== expectedNames.join('\u0000')) {
    throw new Error('Installed world slot structure is incomplete')
  }

  const ownerPath = join(slotPath, INSTALLED_WORLD_OWNER_FILE_NAME)
  const readyPath = join(slotPath, INSTALLED_WORLD_READY_FILE_NAME)
  const packagePath = join(slotPath, INSTALLED_WORLD_PACKAGE_FILE_NAME)
  const [ownerStats, readyStats, packageStats] = await Promise.all([
    lstat(ownerPath),
    lstat(readyPath),
    lstat(packagePath)
  ])
  if (
    ownerStats.isSymbolicLink() ||
    !ownerStats.isFile() ||
    readyStats.isSymbolicLink() ||
    !readyStats.isFile() ||
    readyStats.size !== 0 ||
    packageStats.isSymbolicLink() ||
    !packageStats.isFile()
  ) {
    throw new Error('Installed world slot metadata is invalid')
  }
  const [realOwnerPath, realReadyPath, realPackagePath] = await Promise.all([
    realpath(ownerPath),
    realpath(readyPath),
    realpath(packagePath)
  ])
  const ownerContents = await readStableSmallFile(
    ownerPath,
    ownerStats,
    MAXIMUM_OWNER_BYTES
  )
  if (
    !isDirectChild(realSlotPath, realOwnerPath) ||
    !isDirectChild(realSlotPath, realReadyPath) ||
    !isDirectChild(realSlotPath, realPackagePath) ||
    !isInstalledWorldOwnerContents(ownerContents, record.storageSlotId)
  ) {
    throw new Error('Installed world slot ownership is invalid')
  }

  const inspected = await inspectStableFateworldPackage(packagePath, validatePackage)
  if (
    inspected.package.world.id !== record.worldId ||
    inspected.package.world.version !== record.worldVersion ||
    inspected.package.formatVersion !== record.formatVersion ||
    inspected.package.profile !== record.profile ||
    inspected.sha256 !== record.packageSha256 ||
    inspected.contents.byteLength !== record.packageSizeBytes
  ) {
    throw new Error('Installed package does not match its SQLite record')
  }

  return Object.freeze({
    record,
    package: inspected.package,
    fileName: INSTALLED_WORLD_PACKAGE_FILE_NAME,
    packagePath: inspected.path,
    realPackagePath: inspected.realPath,
    packageSnapshot: inspected.snapshot,
    packageContents: inspected.contents,
    slotPath,
    realSlotPath,
    ownerContents
  })
}

export async function inspectInstalledWorldStore(
  worldsDirectory: string,
  records: readonly InstalledWorldVersionRecord[],
  options: InstalledWorldStoreOptions = {}
): Promise<InstalledWorldStoreInspection> {
  const storePath = join(resolve(worldsDirectory), INSTALLED_WORLD_STORE_DIRECTORY_NAME)
  const entries: InstalledWorldStoreEntry[] = []
  const issues: WorldPackageCatalogIssue[] = []
  let slotNames: string[] = []

  try {
    const worldsPath = resolve(worldsDirectory)
    const [worldsStats, realWorldsPath, storeStats, realStorePath] = await Promise.all([
      lstat(worldsPath),
      realpath(worldsPath),
      lstat(storePath),
      realpath(storePath)
    ])
    if (
      worldsStats.isSymbolicLink() ||
      !worldsStats.isDirectory() ||
      storeStats.isSymbolicLink() ||
      !storeStats.isDirectory() ||
      !isDirectChild(realWorldsPath, realStorePath)
    ) {
      throw new Error('Installed world store is unsafe')
    }
    slotNames = await readdir(storePath)
    if (slotNames.length > MAXIMUM_INSTALLED_SLOTS) {
      issues.push(installationIssue('installed-worlds', 'INSTALLED_WORLD_STORE_LIMIT'))
      slotNames = slotNames.slice(0, MAXIMUM_INSTALLED_SLOTS)
    }
  } catch (error) {
    if (!isNodeErrorWithCode(error, 'ENOENT') && records.length === 0) {
      issues.push(
        installationIssue('installed-worlds', 'INSTALLED_WORLD_STORE_UNAVAILABLE')
      )
    } else if (!isNodeErrorWithCode(error, 'ENOENT') || records.length > 0) {
      for (const record of records) {
        issues.push(
          installationIssue(
            `${record.worldId}@${record.worldVersion}`,
            'INSTALLED_PACKAGE_MISSING',
            record
          )
        )
      }
    }
    return { entries, issues }
  }

  const referencedSlots = new Set(records.map((record) => record.storageSlotId))
  for (const record of records) {
    try {
      entries.push(
        await inspectPublishedInstalledWorldSlot(
          worldsDirectory,
          record,
          options.validatePackage
        )
      )
    } catch {
      issues.push(
        installationIssue(
          `${record.worldId}@${record.worldVersion}`,
          'INSTALLED_PACKAGE_INVALID',
          record
        )
      )
    }
  }

  for (const slotName of slotNames) {
    if (referencedSlots.has(slotName)) continue
    issues.push(
      installationIssue(
        isInstalledWorldSlotId(slotName)
          ? `installation-slot-${slotName.slice(0, 8)}`
          : 'installed-worlds',
        isInstalledWorldSlotId(slotName)
          ? 'ORPHANED_INSTALLATION_SLOT'
          : 'INSTALLED_WORLD_STORE_UNEXPECTED_ENTRY'
      )
    )
  }

  return { entries, issues }
}
