import { createHash, randomUUID } from 'node:crypto'
import { constants as fsConstants, type Stats } from 'node:fs'
import { copyFile, lstat, mkdir, open, readdir, realpath, rm } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type {
  WorldPackageAddErrorCode,
  WorldPackageAddResult
} from '../../shared/world-package-add.ts'
import {
  FATEWORLD_LIMITS,
  type FateworldPackageInfo,
  type FateworldValidationResult
} from './fateworld-contract.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'
import {
  isManagedWorldSlotId,
  MANAGED_WORLD_OWNER_FILE_NAME,
  MANAGED_WORLD_READY_FILE_NAME,
  MANAGED_WORLD_STORE_DIRECTORY_NAME,
  managedWorldOwnerContents,
  managedWorldPackageFileName
} from './world-package-managed-store.ts'
import {
  inspectWorldPackageCatalog,
  type AvailableWorldPackageSource
} from './world-package-catalog.ts'

const MAXIMUM_SLOT_ATTEMPTS = 4
const MAXIMUM_OWNER_BYTES = 128

export class WorldPackageAddError extends Error {
  readonly code: WorldPackageAddErrorCode

  constructor(code: WorldPackageAddErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'WorldPackageAddError'
    this.code = code
  }
}

export interface WorldPackageAddOptions {
  readonly validatePackage?: (packagePath: string) => Promise<FateworldValidationResult>
  readonly tokenFactory?: () => string
  readonly ownerTokenFactory?: () => string
  readonly publishReady?: (readyPath: string) => Promise<void>
}

interface InspectedPackage {
  readonly path: string
  readonly realPath: string
  readonly snapshot: Stats
  readonly package: FateworldPackageInfo
  readonly sha256: string
}

interface PreparedInbox {
  readonly path: string
  readonly realPath: string
}

interface ManagedStore {
  readonly path: string
  readonly realPath: string
}

interface OwnedManagedSlot {
  readonly id: string
  readonly path: string
  readonly realPath: string
  readonly ownerPath: string
  readonly ownerContents: string
  readonly packagePath: string
  readonly readyPath: string
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

function isIncompatible(validation: FateworldValidationResult): boolean {
  if (validation.valid) return false
  return validation.errors.some(
    (error) =>
      error.code === 'UNSUPPORTED_FORMAT_VERSION' || error.code === 'UNSUPPORTED_CAPABILITY'
  )
}

function releaseMatches(
  packageInfo: { readonly worldId?: string; readonly worldVersion?: string },
  selected: FateworldPackageInfo
): boolean {
  return (
    packageInfo.worldId === selected.world.id &&
    packageInfo.worldVersion === selected.world.version
  )
}

function calculateSha256(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex')
}

async function syncHandleWhenSupported(handle: Awaited<ReturnType<typeof open>>): Promise<void> {
  try {
    await handle.sync()
  } catch (error) {
    if (!isUnsupportedSyncError(error)) throw error
  }
}

async function readStablePackageContents(packagePath: string, expected: Stats): Promise<Buffer> {
  const noFollow = typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0
  const handle = await open(packagePath, fsConstants.O_RDONLY | noFollow)

  try {
    const opened = await handle.stat()
    if (
      !opened.isFile() ||
      !sameFileSnapshot(expected, opened) ||
      opened.size > FATEWORLD_LIMITS.maximumArchiveBytes
    ) {
      throw new Error('Package changed or exceeded the compressed size limit')
    }

    const contents = Buffer.alloc(opened.size + 1)
    let offset = 0
    while (offset < contents.length) {
      const { bytesRead } = await handle.read(
        contents,
        offset,
        contents.length - offset,
        offset
      )
      if (bytesRead === 0) break
      offset += bytesRead
    }

    if (offset !== opened.size) {
      throw new Error('Package changed while it was being read')
    }
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
  const noFollow = typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0
  const handle = await open(filePath, fsConstants.O_RDONLY | noFollow)

  try {
    const opened = await handle.stat()
    if (!opened.isFile() || !sameFileSnapshot(expected, opened) || opened.size > maximumBytes) {
      throw new Error('Ownership marker changed or exceeded its size limit')
    }
    const contents = Buffer.alloc(opened.size + 1)
    let offset = 0
    while (offset < contents.length) {
      const { bytesRead } = await handle.read(contents, offset, contents.length - offset, offset)
      if (bytesRead === 0) break
      offset += bytesRead
    }
    if (offset !== opened.size) throw new Error('Ownership marker changed while being read')
    return contents.subarray(0, offset).toString('utf8')
  } finally {
    await handle.close()
  }
}

async function inspectSelectedPackage(
  selectedPath: string,
  validatePackage: (packagePath: string) => Promise<FateworldValidationResult>
): Promise<InspectedPackage> {
  const packagePath = resolve(selectedPath)
  let before: Stats

  try {
    before = await lstat(packagePath)
  } catch (error) {
    throw new WorldPackageAddError('invalid-package', 'The selected package is unavailable', {
      cause: error
    })
  }

  if (before.isSymbolicLink() || !before.isFile()) {
    throw new WorldPackageAddError('invalid-package', 'The selected package is not a regular file')
  }

  let validation: FateworldValidationResult
  try {
    validation = await validatePackage(packagePath)
  } catch (error) {
    throw new WorldPackageAddError(
      'invalid-package',
      'The selected package could not be validated',
      { cause: error }
    )
  }

  if (!validation.valid) {
    throw new WorldPackageAddError(
      isIncompatible(validation) ? 'incompatible-package' : 'invalid-package',
      'The selected package did not pass Fateworld validation'
    )
  }

  try {
    const contents = await readStablePackageContents(packagePath, before)
    const [after, realPackagePath] = await Promise.all([lstat(packagePath), realpath(packagePath)])
    if (after.isSymbolicLink() || !after.isFile() || !sameFileSnapshot(before, after)) {
      throw new WorldPackageAddError(
        'package-changed',
        'The selected package changed while it was being inspected'
      )
    }

    return {
      path: packagePath,
      realPath: realPackagePath,
      snapshot: after,
      package: validation.package,
      sha256: calculateSha256(contents)
    }
  } catch (error) {
    if (error instanceof WorldPackageAddError) throw error
    throw new WorldPackageAddError(
      'package-changed',
      'The selected package changed while it was being inspected',
      { cause: error }
    )
  }
}

async function prepareInbox(inboxDirectory: string): Promise<PreparedInbox> {
  const directory = resolve(inboxDirectory)

  try {
    await mkdir(directory, { recursive: true })
    const stats = await lstat(directory)
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error('The world package inbox is not a regular directory')
    }
    return { path: directory, realPath: await realpath(directory) }
  } catch (error) {
    throw new WorldPackageAddError(
      'destination-unavailable',
      'The world package inbox could not be prepared safely',
      { cause: error }
    )
  }
}

async function prepareManagedStore(inbox: PreparedInbox): Promise<ManagedStore> {
  const storePath = join(inbox.path, MANAGED_WORLD_STORE_DIRECTORY_NAME)

  try {
    await mkdir(storePath)
  } catch (error) {
    if (!isNodeErrorWithCode(error, 'EEXIST')) {
      throw new WorldPackageAddError(
        'destination-unavailable',
        'The managed world package store could not be created',
        { cause: error }
      )
    }
  }

  try {
    const stats = await lstat(storePath)
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error('The managed world package store is not a regular directory')
    }
    const realStorePath = await realpath(storePath)
    if (!isDirectChild(inbox.realPath, realStorePath)) {
      throw new Error('The managed world package store escapes the inbox')
    }
    return { path: storePath, realPath: realStorePath }
  } catch (error) {
    throw new WorldPackageAddError(
      'destination-unavailable',
      'The managed world package store could not be verified safely',
      { cause: error }
    )
  }
}

async function writeOwnerMarker(ownerPath: string, contents: string): Promise<void> {
  const handle = await open(ownerPath, 'wx', 0o600)
  try {
    await handle.writeFile(contents, { encoding: 'utf8' })
    await syncHandleWhenSupported(handle)
  } finally {
    await handle.close()
  }
}

async function createOwnedManagedSlot(
  store: ManagedStore,
  tokenFactory: () => string,
  ownerTokenFactory: () => string
): Promise<OwnedManagedSlot> {
  for (let attempt = 0; attempt < MAXIMUM_SLOT_ATTEMPTS; attempt += 1) {
    const id = tokenFactory()
    if (!isManagedWorldSlotId(id)) {
      throw new WorldPackageAddError(
        'copy-failed',
        'The generated managed package identifier is invalid'
      )
    }

    const slotPath = join(store.path, id)
    try {
      await mkdir(slotPath)
    } catch (error) {
      if (isNodeErrorWithCode(error, 'EEXIST')) continue
      throw new WorldPackageAddError(
        'copy-failed',
        'The managed package slot could not be created',
        { cause: error }
      )
    }

    const realSlotPath = await realpath(slotPath)
    const slotStats = await lstat(slotPath)
    if (
      slotStats.isSymbolicLink() ||
      !slotStats.isDirectory() ||
      !isDirectChild(store.realPath, realSlotPath)
    ) {
      throw new WorldPackageAddError('copy-failed', 'The managed package slot is unsafe')
    }

    const ownerId = ownerTokenFactory()
    if (!isManagedWorldSlotId(ownerId)) {
      throw new WorldPackageAddError(
        'copy-failed',
        'The generated managed package ownership identifier is invalid'
      )
    }
    const ownerContents = managedWorldOwnerContents(id, ownerId)
    const ownerPath = join(slotPath, MANAGED_WORLD_OWNER_FILE_NAME)
    await writeOwnerMarker(ownerPath, ownerContents)
    return {
      id,
      path: slotPath,
      realPath: realSlotPath,
      ownerPath,
      ownerContents,
      packagePath: join(slotPath, managedWorldPackageFileName(id)),
      readyPath: join(slotPath, MANAGED_WORLD_READY_FILE_NAME)
    }
  }

  throw new WorldPackageAddError(
    'copy-failed',
    'A unique managed package slot could not be reserved'
  )
}

async function readStableCatalogSource(
  source: AvailableWorldPackageSource
): Promise<{ readonly realPath: string; readonly sha256: string }> {
  try {
    const before = await lstat(source.packagePath)
    if (before.isSymbolicLink() || !before.isFile()) throw new Error('Package is not regular')
    const realPackagePath = await realpath(source.packagePath)
    if (realPackagePath !== source.realPackagePath) {
      throw new Error('Package source changed after catalog inspection')
    }
    const contents = await readStablePackageContents(source.packagePath, before)
    const after = await lstat(source.packagePath)
    if (after.isSymbolicLink() || !after.isFile() || !sameFileSnapshot(before, after)) {
      throw new Error('Package changed while it was being compared')
    }
    return { realPath: realPackagePath, sha256: calculateSha256(contents) }
  } catch (error) {
    throw new WorldPackageAddError(
      'destination-unavailable',
      'An available world package could not be compared safely',
      { cause: error }
    )
  }
}

async function findExistingRelease(
  inbox: PreparedInbox,
  selected: InspectedPackage
): Promise<'none' | 'available' | 'conflict'> {
  let inspection: Awaited<ReturnType<typeof inspectWorldPackageCatalog>>
  try {
    inspection = await inspectWorldPackageCatalog(inbox.path)
  } catch (error) {
    throw new WorldPackageAddError(
      'destination-unavailable',
      'The world package inbox could not be checked for conflicts',
      { cause: error }
    )
  }

  if (inspection.catalog.scanLimitReached) {
    throw new WorldPackageAddError(
      'destination-unavailable',
      'The world package inbox reached its safe scan limit'
    )
  }

  if (
    inspection.catalog.issues.some(
      (issue) => issue.kind === 'duplicate' && releaseMatches(issue, selected.package)
    )
  ) {
    return 'conflict'
  }

  const source = inspection.sources.find((candidate) =>
    releaseMatches(candidate.packageInfo, selected.package)
  )
  if (source === undefined) return 'none'

  const existingFile = await readStableCatalogSource(source)
  if (existingFile.realPath === selected.realPath) {
    await assertSelectedPackageUnchanged(selected)
  }
  if (existingFile.sha256 === selected.sha256) {
    return 'available'
  }
  return 'conflict'
}

async function assertSelectedPackageUnchanged(selected: InspectedPackage): Promise<void> {
  try {
    const after = await lstat(selected.path)
    if (after.isSymbolicLink() || !after.isFile() || !sameFileSnapshot(selected.snapshot, after)) {
      throw new Error('Selected package changed')
    }
  } catch (error) {
    throw new WorldPackageAddError(
      'package-changed',
      'The selected package changed while it was being copied',
      { cause: error }
    )
  }
}

async function syncPreparedPackage(packagePath: string): Promise<void> {
  const noFollow = typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0
  const handle = await open(packagePath, fsConstants.O_RDWR | noFollow)
  try {
    const stats = await handle.stat()
    if (!stats.isFile()) throw new Error('Prepared package is not a regular file')
    await syncHandleWhenSupported(handle)
  } finally {
    await handle.close()
  }
}

async function validatePreparedPackage(
  preparedPath: string,
  selected: InspectedPackage,
  validatePackage: (packagePath: string) => Promise<FateworldValidationResult>
): Promise<Stats> {
  const validation = await validatePackage(preparedPath)
  if (!validation.valid) {
    throw new WorldPackageAddError(
      'package-changed',
      'The prepared package does not match the selected package'
    )
  }

  const before = await lstat(preparedPath)
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new WorldPackageAddError(
      'package-changed',
      'The prepared package is not a regular file'
    )
  }
  const contents = await readStablePackageContents(preparedPath, before)
  const after = await lstat(preparedPath)
  if (
    after.isSymbolicLink() ||
    !after.isFile() ||
    !sameFileSnapshot(before, after) ||
    validation.package.world.id !== selected.package.world.id ||
    validation.package.world.version !== selected.package.world.version ||
    calculateSha256(contents) !== selected.sha256
  ) {
    throw new WorldPackageAddError(
      'package-changed',
      'The prepared package does not match the selected package'
    )
  }
  return after
}

async function assertPreparedPackageUnchanged(
  preparedPath: string,
  expected: Stats
): Promise<void> {
  try {
    const after = await lstat(preparedPath)
    if (after.isSymbolicLink() || !after.isFile() || !sameFileSnapshot(expected, after)) {
      throw new Error('Prepared package changed')
    }
  } catch (error) {
    throw new WorldPackageAddError(
      'package-changed',
      'The prepared package changed before publication',
      { cause: error }
    )
  }
}

async function createReadyMarker(readyPath: string): Promise<void> {
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

async function cleanupOwnedUnpublishedSlot(
  store: ManagedStore,
  slot: OwnedManagedSlot
): Promise<void> {
  try {
    if (await pathExists(slot.readyPath)) return
    const slotStats = await lstat(slot.path)
    if (slotStats.isSymbolicLink() || !slotStats.isDirectory()) return
    const realSlotPath = await realpath(slot.path)
    if (realSlotPath !== slot.realPath || !isDirectChild(store.realPath, realSlotPath)) return

    const ownerStats = await lstat(slot.ownerPath)
    if (ownerStats.isSymbolicLink() || !ownerStats.isFile()) return
    const realOwnerPath = await realpath(slot.ownerPath)
    if (!isDirectChild(slot.realPath, realOwnerPath)) return
    if (
      (await readStableSmallFile(slot.ownerPath, ownerStats, MAXIMUM_OWNER_BYTES)) !==
      slot.ownerContents
    ) {
      return
    }

    const names = await readdir(slot.path)
    const allowedNames = new Set([
      MANAGED_WORLD_OWNER_FILE_NAME,
      managedWorldPackageFileName(slot.id)
    ])
    if (names.some((name) => !allowedNames.has(name))) return
    if (names.includes(managedWorldPackageFileName(slot.id))) {
      const packageStats = await lstat(slot.packagePath)
      if (packageStats.isSymbolicLink() || !packageStats.isFile()) return
      const realPackagePath = await realpath(slot.packagePath)
      if (!isDirectChild(slot.realPath, realPackagePath)) return
    }
    if (await pathExists(slot.readyPath)) return

    await rm(slot.path, { recursive: true, force: false })
  } catch {
    // A slot that cannot still be attributed to this operation is preserved.
  }
}

function addOutcome(
  status: 'success' | 'already-available',
  packageInfo: FateworldPackageInfo
): WorldPackageAddResult {
  if (status === 'success') {
    return Object.freeze({
      status: 'success',
      worldId: packageInfo.world.id,
      worldVersion: packageInfo.world.version
    })
  }

  return Object.freeze({
    status: 'already-available',
    worldId: packageInfo.world.id,
    worldVersion: packageInfo.world.version
  })
}

async function resolvePublication(
  inbox: PreparedInbox,
  selected: InspectedPackage,
  readyExists: boolean
): Promise<WorldPackageAddResult | undefined> {
  const publicationState = await findExistingRelease(inbox, selected)
  if (publicationState === 'available') {
    return addOutcome(readyExists ? 'success' : 'already-available', selected.package)
  }
  if (publicationState === 'conflict') {
    throw new WorldPackageAddError(
      'version-conflict',
      'A different package declared the selected world and version during publication'
    )
  }
  return undefined
}

export async function addWorldPackageToInbox(
  selectedPath: string,
  inboxDirectory: string,
  options: WorldPackageAddOptions = {}
): Promise<WorldPackageAddResult> {
  const validatePackage = options.validatePackage ?? validateFateworldPackage
  const tokenFactory = options.tokenFactory ?? randomUUID
  const ownerTokenFactory = options.ownerTokenFactory ?? randomUUID
  const publishReady = options.publishReady ?? createReadyMarker
  const selected = await inspectSelectedPackage(selectedPath, validatePackage)
  const inbox = await prepareInbox(inboxDirectory)
  const existingRelease = await findExistingRelease(inbox, selected)

  if (existingRelease === 'available') {
    return addOutcome('already-available', selected.package)
  }
  if (existingRelease === 'conflict') {
    throw new WorldPackageAddError(
      'version-conflict',
      'A different package already declares the selected world and version'
    )
  }

  const store = await prepareManagedStore(inbox)
  let slot: OwnedManagedSlot | undefined
  try {
    slot = await createOwnedManagedSlot(store, tokenFactory, ownerTokenFactory)
    await copyFile(selected.path, slot.packagePath, fsConstants.COPYFILE_EXCL)
    await assertSelectedPackageUnchanged(selected)
    await syncPreparedPackage(slot.packagePath)
    const preparedSnapshot = await validatePreparedPackage(
      slot.packagePath,
      selected,
      validatePackage
    )

    const releaseBeforePublication = await findExistingRelease(inbox, selected)
    if (releaseBeforePublication === 'available') {
      return addOutcome('already-available', selected.package)
    }
    if (releaseBeforePublication === 'conflict') {
      throw new WorldPackageAddError(
        'version-conflict',
        'A different package declared the selected world and version during the operation'
      )
    }
    await assertPreparedPackageUnchanged(slot.packagePath, preparedSnapshot)

    try {
      await publishReady(slot.readyPath)
    } catch (error) {
      const readyExists = await pathExists(slot.readyPath)
      const resolved = await resolvePublication(inbox, selected, readyExists)
      if (resolved !== undefined) return resolved
      throw new WorldPackageAddError('copy-failed', 'The package could not be published safely', {
        cause: error
      })
    }

    const readyExists = await pathExists(slot.readyPath)
    const resolved = await resolvePublication(inbox, selected, readyExists)
    if (resolved !== undefined) return resolved
    throw new WorldPackageAddError(
      'copy-failed',
      'The published package was not accepted by the catalog'
    )
  } catch (error) {
    if (error instanceof WorldPackageAddError) throw error
    throw new WorldPackageAddError('copy-failed', 'The package could not be copied safely', {
      cause: error
    })
  } finally {
    if (slot !== undefined) {
      await cleanupOwnedUnpublishedSlot(store, slot)
    }
  }
}
