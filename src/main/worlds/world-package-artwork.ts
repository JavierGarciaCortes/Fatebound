import { crc32 } from 'node:zlib'
import { constants as fsConstants, type Stats } from 'node:fs'
import { lstat, open, readdir, realpath } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { Readable } from 'node:stream'
import * as yauzl from 'yauzl'
import {
  WORLD_PACKAGE_ARTWORK_SCHEME,
  type WorldPackageArtworkRole,
  type WorldPackageArtworkUrls
} from '../../shared/world-package-artwork.ts'
import { FATEWORLD_LIMITS } from './fateworld-contract.ts'
import { readActiveInstalledWorldVersion } from './world-installation-repository.ts'
import {
  INSTALLED_WORLD_OWNER_FILE_NAME,
  INSTALLED_WORLD_PACKAGE_FILE_NAME,
  INSTALLED_WORLD_READY_FILE_NAME,
  inspectPublishedInstalledWorldSlot,
  type InstalledWorldStoreEntry
} from './world-package-installed-store.ts'

const WORLD_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/
const WORLD_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const ARTWORK_ROLES = Object.freeze(['hero', 'card', 'emblem'] as const)
const MAXIMUM_ARTWORK_CACHE_ENTRIES = 12
const MAXIMUM_ARTWORK_CACHE_BYTES = FATEWORLD_LIMITS.maximumUncompressedBytes
const MAXIMUM_OWNER_BYTES = 128

interface ParsedArtworkRequest {
  readonly worldId: string
  readonly worldVersion: string
  readonly packageSha256: string
  readonly role: WorldPackageArtworkRole
}

export interface ResolvedWorldPackageArtwork {
  readonly contents: Buffer
  readonly mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
}

interface CachedInstalledArtwork {
  readonly packagePath: string
  readonly realPackagePath: string
  readonly packageSnapshot: Stats
  readonly slotPath: string
  readonly realSlotPath: string
  readonly ownerContents: Buffer
  readonly resources: Readonly<Record<WorldPackageArtworkRole, ResolvedWorldPackageArtwork>>
}

export interface InstalledWorldArtworkResolverOptions {
  readonly readInstallation?: typeof readActiveInstalledWorldVersion
  readonly inspectInstallation?: typeof inspectPublishedInstalledWorldSlot
}

function sameFileSnapshot(left: Stats, right: Stats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  )
}

function cachedArtworkBytes(cache: ReadonlyMap<string, CachedInstalledArtwork>): number {
  let total = 0
  for (const entry of cache.values()) {
    for (const role of ARTWORK_ROLES) total += entry.resources[role].contents.byteLength
  }
  return total
}

async function readOwnerContents(path: string): Promise<Buffer> {
  const before = await lstat(path)
  if (before.isSymbolicLink() || !before.isFile() || before.size > MAXIMUM_OWNER_BYTES) {
    throw new Error('Installed artwork owner metadata is invalid')
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0
  const handle = await open(path, fsConstants.O_RDONLY | noFollow)
  try {
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.size > MAXIMUM_OWNER_BYTES ||
      !sameFileSnapshot(before, stats)
    ) {
      throw new Error('Installed artwork owner metadata is invalid')
    }
    const contents = Buffer.alloc(stats.size + 1)
    let offset = 0
    while (offset < contents.byteLength) {
      const { bytesRead } = await handle.read(
        contents,
        offset,
        contents.byteLength - offset,
        offset
      )
      if (bytesRead === 0) break
      offset += bytesRead
    }
    if (offset !== stats.size) {
      throw new Error('Installed artwork owner metadata changed while being read')
    }
    return contents.subarray(0, offset)
  } finally {
    await handle.close()
  }
}

function parseArtworkRequest(value: string): ParsedArtworkRequest | undefined {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (
    url.protocol !== `${WORLD_PACKAGE_ARTWORK_SCHEME}:` ||
    url.hostname !== 'package' ||
    url.username !== '' ||
    url.password !== '' ||
    url.port !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    return undefined
  }

  const encodedParts = url.pathname.split('/').slice(1)
  if (encodedParts.length !== 4 || encodedParts.some((part) => part.length === 0)) {
    return undefined
  }
  let parts: string[]
  try {
    parts = encodedParts.map((part) => decodeURIComponent(part))
  } catch {
    return undefined
  }
  const worldId = parts[0] ?? ''
  const worldVersion = parts[1] ?? ''
  const packageSha256 = parts[2] ?? ''
  const role = parts[3] ?? ''
  if (
    !WORLD_ID_PATTERN.test(worldId) ||
    !WORLD_VERSION_PATTERN.test(worldVersion) ||
    !SHA256_PATTERN.test(packageSha256) ||
    !ARTWORK_ROLES.includes(role as WorldPackageArtworkRole)
  ) {
    return undefined
  }
  return { worldId, worldVersion, packageSha256, role: role as WorldPackageArtworkRole }
}

export function createInstalledWorldArtworkUrl(
  worldId: string,
  worldVersion: string,
  packageSha256: string,
  role: WorldPackageArtworkRole
): string {
  return `${WORLD_PACKAGE_ARTWORK_SCHEME}://package/${encodeURIComponent(worldId)}/${encodeURIComponent(worldVersion)}/${packageSha256}/${role}`
}

export function createInstalledWorldArtworkUrls(
  worldId: string,
  worldVersion: string,
  packageSha256: string
): WorldPackageArtworkUrls {
  return Object.freeze(
    Object.fromEntries(
      ARTWORK_ROLES.map((role) => [
        role,
        createInstalledWorldArtworkUrl(worldId, worldVersion, packageSha256, role)
      ])
    ) as Record<WorldPackageArtworkRole, string>
  )
}

function openZip(contents: Buffer): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      contents,
      {
        autoClose: false,
        lazyEntries: true,
        decodeStrings: true,
        validateEntrySizes: true,
        strictFileNames: true
      },
      (error, zipFile) => {
        if (error || zipFile === undefined) reject(error ?? new Error('ZIP unavailable'))
        else resolve(zipFile)
      }
    )
  })
}

function nextEntry(zipFile: yauzl.ZipFile): Promise<yauzl.Entry | undefined> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      zipFile.off('entry', onEntry)
      zipFile.off('end', onEnd)
      zipFile.off('error', onError)
    }
    const onEntry = (entry: yauzl.Entry): void => {
      cleanup()
      resolve(entry)
    }
    const onEnd = (): void => {
      cleanup()
      resolve(undefined)
    }
    const onError = (error: Error): void => {
      cleanup()
      reject(error)
    }
    zipFile.once('entry', onEntry)
    zipFile.once('end', onEnd)
    zipFile.once('error', onError)
    zipFile.readEntry()
  })
}

function openEntryStream(zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || stream === undefined) reject(error ?? new Error('ZIP entry unavailable'))
      else resolve(stream)
    })
  })
}

async function readArtworkEntry(zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
  if (
    entry.isEncrypted() ||
    (entry.compressionMethod !== 0 && entry.compressionMethod !== 8) ||
    !Number.isSafeInteger(entry.uncompressedSize) ||
    entry.uncompressedSize > FATEWORLD_LIMITS.maximumFileBytes
  ) {
    throw new Error('Installed artwork entry is not readable within Fateworld limits')
  }
  const stream = await openEntryStream(zipFile, entry)
  const chunks: Buffer[] = []
  let observedBytes = 0
  let observedCrc = 0
  for await (const rawChunk of stream) {
    const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk as Uint8Array)
    observedBytes += chunk.byteLength
    if (observedBytes > FATEWORLD_LIMITS.maximumFileBytes) {
      throw new Error('Installed artwork exceeded its streaming limit')
    }
    observedCrc = crc32(chunk, observedCrc)
    chunks.push(chunk)
  }
  if (observedBytes !== entry.uncompressedSize || (observedCrc >>> 0) !== (entry.crc32 >>> 0)) {
    throw new Error('Installed artwork integrity check failed')
  }
  return Buffer.concat(chunks, observedBytes)
}

function mimeTypeForPath(path: string): ResolvedWorldPackageArtwork['mimeType'] {
  const extension = extname(path).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'
  throw new Error('Installed artwork uses an unsupported image type')
}

async function extractInstalledArtwork(
  installation: InstalledWorldStoreEntry
): Promise<Readonly<Record<WorldPackageArtworkRole, ResolvedWorldPackageArtwork>>> {
  if (installation.package.profile !== 'basic') {
    throw new Error('Installed world does not declare presentation artwork')
  }
  const requestedPaths = installation.package.resources.presentation
  const rolesByPath = new Map<string, WorldPackageArtworkRole[]>()
  for (const role of ARTWORK_ROLES) {
    const path = requestedPaths[role]
    rolesByPath.set(path, [...(rolesByPath.get(path) ?? []), role])
  }

  const resources: Partial<Record<WorldPackageArtworkRole, ResolvedWorldPackageArtwork>> = {}
  const zipFile = await openZip(installation.packageContents)
  try {
    while (Object.keys(resources).length < ARTWORK_ROLES.length) {
      const entry = await nextEntry(zipFile)
      if (entry === undefined) break
      const roles = rolesByPath.get(entry.fileName)
      if (roles === undefined) continue
      if (entry.fileName.endsWith('/')) throw new Error('Installed artwork is not a file')
      const resource = Object.freeze({
        contents: await readArtworkEntry(zipFile, entry),
        mimeType: mimeTypeForPath(entry.fileName)
      })
      for (const role of roles) resources[role] = resource
    }
  } finally {
    zipFile.close()
  }
  if (ARTWORK_ROLES.some((role) => resources[role] === undefined)) {
    throw new Error('Installed presentation artwork is incomplete')
  }
  return Object.freeze(resources as Record<WorldPackageArtworkRole, ResolvedWorldPackageArtwork>)
}

async function createCacheEntry(
  installation: InstalledWorldStoreEntry
): Promise<CachedInstalledArtwork> {
  return Object.freeze({
    packagePath: installation.packagePath,
    realPackagePath: installation.realPackagePath,
    packageSnapshot: installation.packageSnapshot,
    slotPath: installation.slotPath,
    realSlotPath: installation.realSlotPath,
    ownerContents: Buffer.from(installation.ownerContents, 'utf8'),
    resources: await extractInstalledArtwork(installation)
  })
}

async function cacheEntryRemainsValid(entry: CachedInstalledArtwork): Promise<boolean> {
  try {
    const ownerPath = join(entry.slotPath, INSTALLED_WORLD_OWNER_FILE_NAME)
    const readyPath = join(entry.slotPath, INSTALLED_WORLD_READY_FILE_NAME)
    const names = (await readdir(entry.slotPath)).sort()
    const expectedNames = [
      INSTALLED_WORLD_OWNER_FILE_NAME,
      INSTALLED_WORLD_PACKAGE_FILE_NAME,
      INSTALLED_WORLD_READY_FILE_NAME
    ].sort()
    if (names.join('\u0000') !== expectedNames.join('\u0000')) return false
    const [slotStats, packageStats, readyStats, realSlotPath, realPackagePath, owner] =
      await Promise.all([
        lstat(entry.slotPath),
        lstat(entry.packagePath),
        lstat(readyPath),
        realpath(entry.slotPath),
        realpath(entry.packagePath),
        readOwnerContents(ownerPath)
      ])
    return (
      !slotStats.isSymbolicLink() &&
      slotStats.isDirectory() &&
      !packageStats.isSymbolicLink() &&
      packageStats.isFile() &&
      !readyStats.isSymbolicLink() &&
      readyStats.isFile() &&
      readyStats.size === 0 &&
      realSlotPath === entry.realSlotPath &&
      realPackagePath === entry.realPackagePath &&
      sameFileSnapshot(packageStats, entry.packageSnapshot) &&
      owner.equals(entry.ownerContents)
    )
  } catch {
    return false
  }
}

export function createInstalledWorldArtworkResolver(
  getWorldsDirectory: () => string,
  options: InstalledWorldArtworkResolverOptions = {}
): (requestUrl: string) => Promise<ResolvedWorldPackageArtwork | undefined> {
  const cache = new Map<string, CachedInstalledArtwork>()
  const pendingCacheEntries = new Map<string, Promise<CachedInstalledArtwork | undefined>>()
  const readInstallation = options.readInstallation ?? readActiveInstalledWorldVersion
  const inspectInstallation = options.inspectInstallation ?? inspectPublishedInstalledWorldSlot

  return async (requestUrl) => {
    const request = parseArtworkRequest(requestUrl)
    if (request === undefined) return undefined
    const record = await readInstallation(request.worldId, request.worldVersion)
    if (record === undefined || record.packageSha256 !== request.packageSha256) return undefined

    const cacheKey = `${request.worldId}\u0000${request.worldVersion}\u0000${request.packageSha256}\u0000${record.storageSlotId}`
    let cached = cache.get(cacheKey)
    if (cached !== undefined && !(await cacheEntryRemainsValid(cached))) {
      cache.delete(cacheKey)
      cached = undefined
    }
    if (cached === undefined) {
      let pending = pendingCacheEntries.get(cacheKey)
      if (pending === undefined) {
        pending = (async () => {
          try {
            const installation = await inspectInstallation(getWorldsDirectory(), record)
            const prepared = await createCacheEntry(installation)
            if (!(await cacheEntryRemainsValid(prepared))) return undefined
            cache.set(cacheKey, prepared)
            while (
              cache.size > MAXIMUM_ARTWORK_CACHE_ENTRIES ||
              cachedArtworkBytes(cache) > MAXIMUM_ARTWORK_CACHE_BYTES
            ) {
              const oldestKey = cache.keys().next().value as string | undefined
              if (oldestKey === undefined) break
              cache.delete(oldestKey)
            }
            return prepared
          } catch {
            return undefined
          }
        })()
        pendingCacheEntries.set(cacheKey, pending)
        void pending.finally(() => {
          if (pendingCacheEntries.get(cacheKey) === pending) {
            pendingCacheEntries.delete(cacheKey)
          }
        })
      }
      cached = await pending
      if (cached === undefined) return undefined
    }
    return cached.resources[request.role]
  }
}
