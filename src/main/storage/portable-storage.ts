import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const DEVELOPMENT_STORAGE_DIRECTORY = '.fatebound-dev'
const WRITE_PROBE_PREFIX = '.fatebound-write-probe-'

export interface StoragePaths {
  readonly dataDirectory: string
  readonly databaseFile: string
  readonly backupsDirectory: string
  readonly worldsDirectory: string
  readonly exportsDirectory: string
}

export interface StorageRuntime {
  readonly isPackaged: boolean
  readonly appPath: string
  readonly executablePath: string
  readonly portableExecutableDirectory?: string
}

export interface WriteProbeOperations {
  createDirectory(directory: string): Promise<void>
  writeProbeFile(filePath: string, contents: string): Promise<void>
  removeProbeFile(filePath: string): Promise<void>
}

export interface WriteProbeOptions {
  readonly operations?: WriteProbeOperations
  readonly tokenFactory?: () => string
}

export type WriteProbeResult =
  { readonly writable: true } | { readonly writable: false; readonly error: unknown }

const nodeWriteProbeOperations: WriteProbeOperations = {
  async createDirectory(directory) {
    await mkdir(directory, { recursive: true })
  },
  async writeProbeFile(filePath, contents) {
    await writeFile(filePath, contents, { encoding: 'utf8', flag: 'wx' })
  },
  async removeProbeFile(filePath) {
    await rm(filePath, { force: true })
  }
}

let activeStoragePaths: StoragePaths | undefined

export function createStoragePaths(dataDirectory: string): StoragePaths {
  const resolvedDataDirectory = resolve(dataDirectory)

  return Object.freeze({
    dataDirectory: resolvedDataDirectory,
    databaseFile: join(resolvedDataDirectory, 'fatebound.sqlite'),
    backupsDirectory: join(resolvedDataDirectory, 'backups'),
    worldsDirectory: join(resolvedDataDirectory, 'worlds'),
    exportsDirectory: join(resolvedDataDirectory, 'exports')
  })
}

export function resolveDefaultStoragePaths(runtime: StorageRuntime): StoragePaths {
  if (!runtime.isPackaged) {
    return createStoragePaths(join(runtime.appPath, DEVELOPMENT_STORAGE_DIRECTORY, 'data'))
  }

  const portableExecutableDirectory = runtime.portableExecutableDirectory?.trim()
  const portableDirectory = portableExecutableDirectory || dirname(runtime.executablePath)

  return createStoragePaths(join(portableDirectory, 'data'))
}

export async function probeStorageWriteAccess(
  directory: string,
  options: WriteProbeOptions = {}
): Promise<WriteProbeResult> {
  const operations = options.operations ?? nodeWriteProbeOperations
  const token = (options.tokenFactory ?? randomUUID)()
  const probeFile = join(resolve(directory), `${WRITE_PROBE_PREFIX}${token}.tmp`)
  let operationError: unknown
  let directoryCreated = false

  try {
    await operations.createDirectory(resolve(directory))
    directoryCreated = true
    await operations.writeProbeFile(probeFile, 'Fatebound storage write probe')
  } catch (error) {
    operationError = error
  }

  if (directoryCreated) {
    try {
      await operations.removeProbeFile(probeFile)
    } catch (error) {
      operationError ??= error
    }
  }

  return operationError === undefined
    ? { writable: true }
    : { writable: false, error: operationError }
}

export function activateStoragePaths(paths: StoragePaths): void {
  activeStoragePaths = paths
}

export function hasActiveStoragePaths(): boolean {
  return activeStoragePaths !== undefined
}

export function getActiveStoragePaths(): StoragePaths {
  if (!activeStoragePaths) {
    throw new Error('Storage paths have not been initialized')
  }

  return activeStoragePaths
}
