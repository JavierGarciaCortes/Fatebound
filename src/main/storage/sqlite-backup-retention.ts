import { readFile, readdir, rm, stat } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import {
  calculateFileSha256,
  formatBackupDirectoryTimestamp,
  verifySqliteBackupFile,
  type SqliteBackupManifest
} from './sqlite-backup.ts'

export const AUTOMATIC_BACKUP_RETENTION_LIMIT = 6
export const PROTECTED_BACKUP_RETENTION_LIMIT = 2

const BACKUP_DATABASE_FILE = 'fatebound.sqlite'
const BACKUP_MANIFEST_FILE = 'manifest.json'

export interface SqliteBackupCatalogEntry {
  readonly directory: string
  readonly databaseFile: string
  readonly manifestFile: string
  readonly manifest: SqliteBackupManifest
}

export interface SqliteBackupRetentionOptions {
  readonly automaticLimit?: number
  readonly protectedLimit?: number
  readonly preserveDirectories?: readonly string[]
}

export interface SqliteBackupRetentionResult {
  readonly deletedDirectories: readonly string[]
  readonly retainedManagedBackups: number
}

function isBackupReason(value: unknown): value is SqliteBackupManifest['reason'] {
  return (
    value === 'automatic' ||
    value === 'pre-migration' ||
    value === 'protected' ||
    value === 'manual'
  )
}

function parseManagedManifest(value: unknown): SqliteBackupManifest | undefined {
  if (typeof value !== 'object' || value === null) return undefined

  const manifest = value as Record<string, unknown>
  if (
    manifest.formatVersion !== 2 ||
    manifest.application !== 'fatebound' ||
    typeof manifest.id !== 'string' ||
    !/^[a-zA-Z0-9-]+$/.test(manifest.id) ||
    typeof manifest.createdAt !== 'string' ||
    new Date(manifest.createdAt).toISOString() !== manifest.createdAt ||
    !isBackupReason(manifest.reason) ||
    !Number.isSafeInteger(manifest.schemaVersion) ||
    (manifest.schemaVersion as number) < 0 ||
    manifest.databaseFile !== BACKUP_DATABASE_FILE ||
    !Number.isSafeInteger(manifest.sizeBytes) ||
    (manifest.sizeBytes as number) < 0 ||
    typeof manifest.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256)
  ) {
    return undefined
  }

  return manifest as unknown as SqliteBackupManifest
}

function expectedDirectoryName(manifest: SqliteBackupManifest): string {
  return `backup-${formatBackupDirectoryTimestamp(manifest.createdAt)}-${manifest.reason}-${manifest.id}`
}

export async function inspectManagedSqliteBackup(
  directory: string,
  verifyDatabase = verifySqliteBackupFile
): Promise<SqliteBackupCatalogEntry | undefined> {
  const resolvedDirectory = resolve(directory)
  const manifestFile = join(resolvedDirectory, BACKUP_MANIFEST_FILE)
  const databaseFile = join(resolvedDirectory, BACKUP_DATABASE_FILE)

  try {
    const entries = await readdir(resolvedDirectory, { withFileTypes: true })
    if (
      entries.length !== 2 ||
      !entries.some((entry) => entry.isFile() && entry.name === BACKUP_MANIFEST_FILE) ||
      !entries.some((entry) => entry.isFile() && entry.name === BACKUP_DATABASE_FILE)
    ) {
      return undefined
    }

    const manifest = parseManagedManifest(JSON.parse(await readFile(manifestFile, 'utf8')))
    if (!manifest || basename(resolvedDirectory) !== expectedDirectoryName(manifest)) {
      return undefined
    }

    const databaseStats = await stat(databaseFile)
    if (databaseStats.size !== manifest.sizeBytes) return undefined
    if ((await calculateFileSha256(databaseFile)) !== manifest.sha256) return undefined

    verifyDatabase(databaseFile)

    return Object.freeze({ directory: resolvedDirectory, databaseFile, manifestFile, manifest })
  } catch {
    return undefined
  }
}

export async function listManagedSqliteBackups(
  backupsDirectory: string
): Promise<readonly SqliteBackupCatalogEntry[]> {
  const resolvedBackupsDirectory = resolve(backupsDirectory)
  let entries

  try {
    entries = await readdir(resolvedBackupsDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  const inspected = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-'))
      .map((entry) => inspectManagedSqliteBackup(join(resolvedBackupsDirectory, entry.name)))
  )

  return inspected.filter((entry): entry is SqliteBackupCatalogEntry => entry !== undefined)
}

function isProtectedBackup(entry: SqliteBackupCatalogEntry): boolean {
  return entry.manifest.reason === 'pre-migration' || entry.manifest.reason === 'protected'
}

function oldestFirst(
  entries: readonly SqliteBackupCatalogEntry[]
): readonly SqliteBackupCatalogEntry[] {
  return entries.toSorted((left, right) => {
    const dateOrder = left.manifest.createdAt.localeCompare(right.manifest.createdAt)
    return dateOrder === 0 ? left.directory.localeCompare(right.directory) : dateOrder
  })
}

function assertRetentionLimit(limit: number, name: string): void {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }
}

function retentionPathKey(directory: string): string {
  const resolvedDirectory = resolve(directory)
  return process.platform === 'win32' ? resolvedDirectory.toLowerCase() : resolvedDirectory
}

export async function enforceSqliteBackupRetention(
  backupsDirectory: string,
  options: SqliteBackupRetentionOptions = {}
): Promise<SqliteBackupRetentionResult> {
  const resolvedBackupsDirectory = resolve(backupsDirectory)
  const automaticLimit = options.automaticLimit ?? AUTOMATIC_BACKUP_RETENTION_LIMIT
  const protectedLimit = options.protectedLimit ?? PROTECTED_BACKUP_RETENTION_LIMIT
  const preservedDirectories = new Set((options.preserveDirectories ?? []).map(retentionPathKey))
  assertRetentionLimit(automaticLimit, 'automaticLimit')
  assertRetentionLimit(protectedLimit, 'protectedLimit')

  const validBackups = await listManagedSqliteBackups(resolvedBackupsDirectory)
  const automatic = oldestFirst(
    validBackups.filter((entry) => entry.manifest.reason === 'automatic')
  )
  const protectedBackups = oldestFirst(validBackups.filter(isProtectedBackup))
  const candidates = [
    ...automatic
      .filter((entry) => !preservedDirectories.has(retentionPathKey(entry.directory)))
      .slice(0, Math.max(0, automatic.length - automaticLimit)),
    ...protectedBackups
      .filter((entry) => !preservedDirectories.has(retentionPathKey(entry.directory)))
      .slice(0, Math.max(0, protectedBackups.length - protectedLimit))
  ]
  const deletedDirectories: string[] = []
  let remainingValidBackups = validBackups.length

  for (const candidate of oldestFirst(candidates)) {
    if (remainingValidBackups <= 1) break

    const revalidated = await inspectManagedSqliteBackup(candidate.directory)
    if (!revalidated) continue
    if (dirname(revalidated.directory) !== resolvedBackupsDirectory) {
      throw new Error('Refusing to delete a SQLite backup outside the managed backup directory')
    }

    await rm(revalidated.directory, { recursive: true, force: false })
    deletedDirectories.push(revalidated.directory)
    remainingValidBackups -= 1
  }

  return Object.freeze({
    deletedDirectories: Object.freeze(deletedDirectories),
    retainedManagedBackups: remainingValidBackups
  })
}
