import { randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  unlink
} from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { DatabaseSync, type DatabaseSyncOptions } from 'node:sqlite'
import type { SqliteRestorePreview } from '../../shared/sqlite-safe-restore.ts'
import {
  calculateFileSha256,
  verifySqliteBackupFile,
  type SqliteBackupManifest
} from './sqlite-backup.ts'
import {
  inspectManagedSqliteBackup,
  type SqliteBackupCatalogEntry
} from './sqlite-backup-retention.ts'
import { getSqliteMigrationPlan, SQLITE_MIGRATIONS } from './sqlite-migrations.ts'
import type { StoragePaths } from './portable-storage.ts'

const RESTORE_JOURNAL_FILE = '.fatebound-sqlite-restore.json'
const RESTORE_WORKSPACE_PREFIX = '.fatebound-sqlite-restore-'
const RESTORE_WORKSPACE_MARKER = '.fatebound-sqlite-restore-workspace'
const RESTORE_PREVIOUS_DATABASE_FILE = 'previous.sqlite'
const RESTORE_DISPLACED_DATABASE_FILE = 'interrupted.sqlite'
const RESTORE_FAILED_PREVIOUS_DATABASE_FILE = 'failed-previous.sqlite'
const RESTORE_FORMAT_VERSION = 1
const RESTORE_APPLICATION = 'fatebound'

const READ_ONLY_DATABASE_OPTIONS: DatabaseSyncOptions = {
  allowExtension: false,
  enableDoubleQuotedStringLiterals: false,
  enableForeignKeyConstraints: true,
  readOnly: true,
  allowBareNamedParameters: false,
  allowUnknownNamedParameters: false
}

export type SafeSqliteRestoreErrorCode =
  | 'invalid-backup'
  | 'incompatible-backup'
  | 'backup-changed'
  | 'restore-unavailable'
  | 'active-recovery-failed'

export class SafeSqliteRestoreError extends Error {
  readonly code: SafeSqliteRestoreErrorCode

  constructor(code: SafeSqliteRestoreErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'SafeSqliteRestoreError'
    this.code = code
  }
}

export interface RestorableSqliteBackup {
  readonly entry: SqliteBackupCatalogEntry
  readonly preview: SqliteRestorePreview
}

type SqliteRestorePhase = 'preparing' | 'prepared' | 'protected' | 'replacing' | 'completed'

interface SqliteRestoreJournal {
  readonly formatVersion: 1
  readonly application: typeof RESTORE_APPLICATION
  readonly operationId: string
  readonly workspaceDirectoryName: string
  readonly phase: SqliteRestorePhase
  readonly protectedBackupDirectoryName?: string
}

export interface PreparedSqliteRestore {
  readonly journal: SqliteRestoreJournal
  readonly workspaceDirectory: string
  readonly candidateDirectory: string
  readonly candidateDatabaseFile: string
  readonly previousDatabaseFile: string
}

export type InterruptedSqliteRestoreRecovery = 'none' | 'rolled-back' | 'completed'

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT'
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (isMissingFileError(error)) return false
    throw error
  }
}

async function syncFile(filePath: string): Promise<void> {
  const handle = await open(filePath, 'r+')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function writeExclusiveSyncedFile(filePath: string, contents: string): Promise<void> {
  const handle = await open(filePath, 'wx')
  try {
    await handle.writeFile(contents, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
}

function isSafeOperationId(value: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(value)
}

function isSafeProtectedBackupDirectoryName(value: string): boolean {
  return /^backup-\d{8}T\d{6}Z-protected-[a-zA-Z0-9-]+$/.test(value)
}

function journalFile(paths: StoragePaths): string {
  return join(resolve(paths.dataDirectory), RESTORE_JOURNAL_FILE)
}

function workspaceDirectory(paths: StoragePaths, journal: SqliteRestoreJournal): string {
  const directory = resolve(paths.dataDirectory, journal.workspaceDirectoryName)
  if (
    dirname(directory) !== resolve(paths.dataDirectory) ||
    journal.workspaceDirectoryName !== `${RESTORE_WORKSPACE_PREFIX}${journal.operationId}`
  ) {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The SQLite restore journal refers to an unsafe workspace'
    )
  }
  return directory
}

async function assertOwnedRestoreWorkspace(
  paths: StoragePaths,
  journal: SqliteRestoreJournal
): Promise<string> {
  const directory = workspaceDirectory(paths, journal)
  const workspaceStats = await lstat(directory)
  if (!workspaceStats.isDirectory() || workspaceStats.isSymbolicLink()) {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The SQLite restore workspace is not a regular directory'
    )
  }

  let marker: string | undefined
  try {
    marker = await readFile(join(directory, RESTORE_WORKSPACE_MARKER), 'utf8')
  } catch (error) {
    if (!isMissingFileError(error)) throw error
  }
  if (
    marker !== undefined &&
    marker !== `${RESTORE_APPLICATION}:${journal.operationId}\n` &&
    journal.phase !== 'preparing'
  ) {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The SQLite restore workspace marker is invalid'
    )
  }

  return directory
}

function parseRestoreJournal(value: unknown): SqliteRestoreJournal {
  if (typeof value !== 'object' || value === null) {
    throw new SafeSqliteRestoreError('restore-unavailable', 'The SQLite restore journal is invalid')
  }

  const journal = value as Record<string, unknown>
  const phases: readonly SqliteRestorePhase[] = [
    'preparing',
    'prepared',
    'protected',
    'replacing',
    'completed'
  ]

  if (
    journal.formatVersion !== RESTORE_FORMAT_VERSION ||
    journal.application !== RESTORE_APPLICATION ||
    typeof journal.operationId !== 'string' ||
    !isSafeOperationId(journal.operationId) ||
    journal.workspaceDirectoryName !== `${RESTORE_WORKSPACE_PREFIX}${journal.operationId}` ||
    typeof journal.phase !== 'string' ||
    !phases.includes(journal.phase as SqliteRestorePhase) ||
    (journal.phase === 'protected' ||
      journal.phase === 'replacing' ||
      journal.phase === 'completed') !==
      (typeof journal.protectedBackupDirectoryName === 'string') ||
    (journal.protectedBackupDirectoryName !== undefined &&
      (typeof journal.protectedBackupDirectoryName !== 'string' ||
        !isSafeProtectedBackupDirectoryName(journal.protectedBackupDirectoryName)))
  ) {
    throw new SafeSqliteRestoreError('restore-unavailable', 'The SQLite restore journal is invalid')
  }

  return Object.freeze({
    formatVersion: RESTORE_FORMAT_VERSION,
    application: RESTORE_APPLICATION,
    operationId: journal.operationId,
    workspaceDirectoryName: journal.workspaceDirectoryName,
    phase: journal.phase as SqliteRestorePhase,
    ...(typeof journal.protectedBackupDirectoryName === 'string'
      ? { protectedBackupDirectoryName: journal.protectedBackupDirectoryName }
      : {})
  })
}

async function readRestoreJournal(paths: StoragePaths): Promise<SqliteRestoreJournal | undefined> {
  try {
    return parseRestoreJournal(JSON.parse(await readFile(journalFile(paths), 'utf8')))
  } catch (error) {
    if (isMissingFileError(error)) return undefined
    if (error instanceof SafeSqliteRestoreError) throw error
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The SQLite restore journal could not be read safely',
      { cause: error }
    )
  }
}

async function writeRestoreJournal(
  paths: StoragePaths,
  journal: SqliteRestoreJournal
): Promise<void> {
  const dataDirectory = resolve(paths.dataDirectory)
  const temporaryFile = join(
    dataDirectory,
    `${RESTORE_WORKSPACE_PREFIX}${journal.operationId}-${randomUUID()}.tmp`
  )

  try {
    await writeExclusiveSyncedFile(temporaryFile, `${JSON.stringify(journal, null, 2)}\n`)
    await rename(temporaryFile, journalFile(paths))
    await syncFile(journalFile(paths))
  } catch (error) {
    await rm(temporaryFile, { force: true }).catch(() => undefined)
    throw error
  }
}

function withJournalPhase(
  journal: SqliteRestoreJournal,
  phase: SqliteRestorePhase,
  protectedBackupDirectoryName = journal.protectedBackupDirectoryName
): SqliteRestoreJournal {
  return Object.freeze({
    formatVersion: RESTORE_FORMAT_VERSION,
    application: RESTORE_APPLICATION,
    operationId: journal.operationId,
    workspaceDirectoryName: journal.workspaceDirectoryName,
    phase,
    ...(protectedBackupDirectoryName ? { protectedBackupDirectoryName } : {})
  })
}

function manifestsMatch(left: SqliteBackupManifest, right: SqliteBackupManifest): boolean {
  return (
    left.formatVersion === right.formatVersion &&
    left.application === right.application &&
    left.id === right.id &&
    left.createdAt === right.createdAt &&
    left.reason === right.reason &&
    left.schemaVersion === right.schemaVersion &&
    left.databaseFile === right.databaseFile &&
    left.sizeBytes === right.sizeBytes &&
    left.sha256 === right.sha256
  )
}

function assertCompatibleSchema(entry: SqliteBackupCatalogEntry): void {
  if (entry.manifest.schemaVersion > SQLITE_MIGRATIONS.length) {
    throw new SafeSqliteRestoreError(
      'incompatible-backup',
      'The selected SQLite backup requires a newer Fatebound schema'
    )
  }

  const database = new DatabaseSync(resolve(entry.databaseFile), READ_ONLY_DATABASE_OPTIONS)

  try {
    database.exec(`
      PRAGMA query_only = ON;
      PRAGMA temp_store = MEMORY;
      PRAGMA trusted_schema = OFF;
    `)
    const plan = getSqliteMigrationPlan(database)
    if (plan.currentVersion !== entry.manifest.schemaVersion) {
      throw new SafeSqliteRestoreError(
        'invalid-backup',
        'The SQLite backup manifest schema version does not match its database'
      )
    }
  } catch (error) {
    if (error instanceof SafeSqliteRestoreError) throw error
    throw new SafeSqliteRestoreError(
      'incompatible-backup',
      'The selected SQLite backup has an incompatible migration history',
      { cause: error }
    )
  } finally {
    database.close()
  }
}

function assertCompatibleDatabaseFile(databaseFile: string): void {
  verifySqliteBackupFile(databaseFile)
  const database = new DatabaseSync(resolve(databaseFile), READ_ONLY_DATABASE_OPTIONS)

  try {
    database.exec(`
      PRAGMA query_only = ON;
      PRAGMA temp_store = MEMORY;
      PRAGMA trusted_schema = OFF;
    `)
    getSqliteMigrationPlan(database)
  } finally {
    database.close()
  }
}

async function assertDatabaseMatchesManifest(
  databaseFile: string,
  manifest: SqliteBackupManifest
): Promise<void> {
  const databaseStats = await stat(databaseFile)
  if (
    databaseStats.size !== manifest.sizeBytes ||
    (await calculateFileSha256(databaseFile)) !== manifest.sha256
  ) {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'A protected SQLite recovery copy did not match its manifest'
    )
  }
  assertCompatibleDatabaseFile(databaseFile)
}

export async function inspectRestorableSqliteBackup(
  directory: string
): Promise<RestorableSqliteBackup> {
  let canonicalDirectory: string

  try {
    canonicalDirectory = await realpath(resolve(directory))
    if (!(await stat(canonicalDirectory)).isDirectory()) {
      throw new Error('The selected path is not a directory')
    }
  } catch (error) {
    throw new SafeSqliteRestoreError(
      'invalid-backup',
      'The selected SQLite backup directory is unavailable',
      { cause: error }
    )
  }

  const entry = await inspectManagedSqliteBackup(canonicalDirectory)
  if (!entry) {
    throw new SafeSqliteRestoreError(
      'invalid-backup',
      'The selected directory is not a complete and verified Fatebound SQLite backup'
    )
  }

  assertCompatibleSchema(entry)
  return Object.freeze({
    entry,
    preview: Object.freeze({
      createdAt: entry.manifest.createdAt,
      reason: entry.manifest.reason,
      schemaVersion: entry.manifest.schemaVersion,
      sizeBytes: entry.manifest.sizeBytes
    })
  })
}

export function areSameRestorableSqliteBackup(
  selected: RestorableSqliteBackup,
  revalidated: RestorableSqliteBackup
): boolean {
  return (
    selected.entry.directory === revalidated.entry.directory &&
    manifestsMatch(selected.entry.manifest, revalidated.entry.manifest)
  )
}

async function removeRestoreOperation(
  paths: StoragePaths,
  journal: SqliteRestoreJournal
): Promise<void> {
  const currentJournal = await readRestoreJournal(paths)
  if (
    !currentJournal ||
    currentJournal.operationId !== journal.operationId ||
    currentJournal.phase !== journal.phase ||
    currentJournal.protectedBackupDirectoryName !== journal.protectedBackupDirectoryName
  ) {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'Refusing to clean a SQLite restore without its matching journal'
    )
  }

  const directory = workspaceDirectory(paths, journal)

  if (await pathExists(directory)) {
    await assertOwnedRestoreWorkspace(paths, journal)
    await rm(directory, { recursive: true, force: false })
  }
  await unlink(journalFile(paths))
}

export async function prepareSqliteRestore(
  backup: RestorableSqliteBackup,
  paths: StoragePaths
): Promise<PreparedSqliteRestore> {
  if (await readRestoreJournal(paths)) {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'A previous SQLite restore requires recovery before another can start'
    )
  }

  const operationId = randomUUID()
  let journal: SqliteRestoreJournal = Object.freeze({
    formatVersion: RESTORE_FORMAT_VERSION,
    application: RESTORE_APPLICATION,
    operationId,
    workspaceDirectoryName: `${RESTORE_WORKSPACE_PREFIX}${operationId}`,
    phase: 'preparing'
  })
  const directory = workspaceDirectory(paths, journal)
  const candidateDirectory = join(directory, basename(backup.entry.directory))
  const candidateDatabaseFile = join(candidateDirectory, 'fatebound.sqlite')
  const candidateManifestFile = join(candidateDirectory, 'manifest.json')
  let workspaceCreated = false

  await writeRestoreJournal(paths, journal)

  try {
    await mkdir(directory)
    workspaceCreated = true
    await writeExclusiveSyncedFile(
      join(directory, RESTORE_WORKSPACE_MARKER),
      `${RESTORE_APPLICATION}:${operationId}\n`
    )
    await mkdir(candidateDirectory)
    await copyFile(backup.entry.databaseFile, candidateDatabaseFile, fsConstants.COPYFILE_EXCL)
    await copyFile(backup.entry.manifestFile, candidateManifestFile, fsConstants.COPYFILE_EXCL)
    await Promise.all([syncFile(candidateDatabaseFile), syncFile(candidateManifestFile)])

    const copiedEntry = await inspectManagedSqliteBackup(candidateDirectory)
    if (!copiedEntry || !manifestsMatch(backup.entry.manifest, copiedEntry.manifest)) {
      throw new SafeSqliteRestoreError(
        'backup-changed',
        'The SQLite backup changed while it was being prepared for restoration'
      )
    }
    assertCompatibleSchema(copiedEntry)

    journal = withJournalPhase(journal, 'prepared')
    await writeRestoreJournal(paths, journal)

    return Object.freeze({
      journal,
      workspaceDirectory: directory,
      candidateDirectory,
      candidateDatabaseFile,
      previousDatabaseFile: join(directory, RESTORE_PREVIOUS_DATABASE_FILE)
    })
  } catch (error) {
    try {
      if (workspaceCreated) await rm(directory, { recursive: true, force: false })
      await unlink(journalFile(paths))
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'SQLite restore preparation failed and its workspace could not be cleaned safely'
      )
    }
    throw error
  }
}

export async function recordProtectedSqliteRestoreBackup(
  paths: StoragePaths,
  prepared: PreparedSqliteRestore,
  protectedBackupDirectory: string
): Promise<PreparedSqliteRestore> {
  if (prepared.journal.phase !== 'prepared') {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The SQLite restore candidate is not ready for protected backup registration'
    )
  }

  const protectedBackupDirectoryName = basename(resolve(protectedBackupDirectory))
  if (
    dirname(resolve(protectedBackupDirectory)) !== resolve(paths.backupsDirectory) ||
    !isSafeProtectedBackupDirectoryName(protectedBackupDirectoryName)
  ) {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The pre-restore backup is outside the managed backup directory'
    )
  }

  const journal = withJournalPhase(prepared.journal, 'protected', protectedBackupDirectoryName)
  await writeRestoreJournal(paths, journal)
  return Object.freeze({ ...prepared, journal })
}

export async function installPreparedSqliteRestore(
  paths: StoragePaths,
  prepared: PreparedSqliteRestore
): Promise<PreparedSqliteRestore> {
  if (prepared.journal.phase !== 'protected') {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The active database cannot be replaced without a verified protected backup'
    )
  }

  await assertOwnedRestoreWorkspace(paths, prepared.journal)
  const journal = withJournalPhase(prepared.journal, 'replacing')
  await writeRestoreJournal(paths, journal)
  await rename(resolve(paths.databaseFile), prepared.previousDatabaseFile)
  await rename(prepared.candidateDatabaseFile, resolve(paths.databaseFile))
  return Object.freeze({ ...prepared, journal })
}

export async function completeSqliteRestore(
  paths: StoragePaths,
  prepared: PreparedSqliteRestore
): Promise<void> {
  if (prepared.journal.phase !== 'replacing') {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The SQLite restore cannot be completed before replacement'
    )
  }

  const journal = withJournalPhase(prepared.journal, 'completed')
  await writeRestoreJournal(paths, journal)
  await removeRestoreOperation(paths, journal)
}

async function restoreProtectedBackup(
  paths: StoragePaths,
  journal: SqliteRestoreJournal,
  displacedDatabaseFile: string
): Promise<void> {
  if (!journal.protectedBackupDirectoryName) {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The interrupted SQLite restore has no recoverable previous database'
    )
  }

  const backupDirectory = join(
    resolve(paths.backupsDirectory),
    journal.protectedBackupDirectoryName
  )
  const protectedBackup = await inspectManagedSqliteBackup(backupDirectory)
  if (!protectedBackup || protectedBackup.manifest.reason !== 'protected') {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'The protected pre-restore SQLite backup is unavailable or invalid'
    )
  }
  assertCompatibleSchema(protectedBackup)

  if (await pathExists(paths.databaseFile)) {
    try {
      await assertDatabaseMatchesManifest(paths.databaseFile, protectedBackup.manifest)
      return
    } catch {
      // The active file is not the protected pre-restore database. Preserve it below.
    }

    const fallbackDisplacedDatabaseFile = join(
      dirname(displacedDatabaseFile),
      RESTORE_FAILED_PREVIOUS_DATABASE_FILE
    )
    const availableDisplacedDatabaseFile = (await pathExists(displacedDatabaseFile))
      ? fallbackDisplacedDatabaseFile
      : displacedDatabaseFile
    if (await pathExists(availableDisplacedDatabaseFile)) {
      throw new SafeSqliteRestoreError(
        'restore-unavailable',
        'The interrupted SQLite restore contains conflicting recovery files'
      )
    }
    await rename(paths.databaseFile, availableDisplacedDatabaseFile)
  }

  const recoveryCandidate = join(
    resolve(paths.dataDirectory),
    `${RESTORE_WORKSPACE_PREFIX}${journal.operationId}-recovery.tmp`
  )
  await rm(recoveryCandidate, { force: true })
  await copyFile(protectedBackup.databaseFile, recoveryCandidate, fsConstants.COPYFILE_EXCL)
  await syncFile(recoveryCandidate)

  try {
    await assertDatabaseMatchesManifest(recoveryCandidate, protectedBackup.manifest)
    await rename(recoveryCandidate, resolve(paths.databaseFile))
  } catch (error) {
    await rm(recoveryCandidate, { force: true }).catch(() => undefined)
    throw error
  }
}

async function rollBackInterruptedRestore(
  paths: StoragePaths,
  journal: SqliteRestoreJournal
): Promise<void> {
  const directory = workspaceDirectory(paths, journal)
  const previousDatabaseFile = join(directory, RESTORE_PREVIOUS_DATABASE_FILE)
  const displacedDatabaseFile = join(directory, RESTORE_DISPLACED_DATABASE_FILE)

  if (await pathExists(previousDatabaseFile)) {
    if (await pathExists(paths.databaseFile)) {
      if (await pathExists(displacedDatabaseFile)) {
        throw new SafeSqliteRestoreError(
          'restore-unavailable',
          'The interrupted SQLite restore contains conflicting recovery files'
        )
      }
      await rename(paths.databaseFile, displacedDatabaseFile)
    }
    await rename(previousDatabaseFile, resolve(paths.databaseFile))
  } else if (journal.phase === 'replacing' || journal.phase === 'completed') {
    await restoreProtectedBackup(paths, journal, displacedDatabaseFile)
  } else if (!(await pathExists(paths.databaseFile))) {
    await restoreProtectedBackup(paths, journal, displacedDatabaseFile)
  }

  try {
    assertCompatibleDatabaseFile(paths.databaseFile)
  } catch {
    await restoreProtectedBackup(paths, journal, displacedDatabaseFile)
    assertCompatibleDatabaseFile(paths.databaseFile)
  }
}

export async function recoverInterruptedSqliteRestore(
  paths: StoragePaths
): Promise<InterruptedSqliteRestoreRecovery> {
  const journal = await readRestoreJournal(paths)
  if (!journal) return 'none'

  const directory = workspaceDirectory(paths, journal)
  if (!(await pathExists(directory))) {
    const activeDatabaseExists = await pathExists(paths.databaseFile)

    if (journal.phase === 'completed' && activeDatabaseExists) {
      let activeDatabaseValid = true
      try {
        assertCompatibleDatabaseFile(paths.databaseFile)
      } catch {
        activeDatabaseValid = false
      }
      if (activeDatabaseValid) {
        await unlink(journalFile(paths))
        return 'completed'
      }
    }

    const requiresProtectedRecovery =
      journal.phase === 'replacing' ||
      journal.phase === 'completed' ||
      (journal.phase === 'protected' && !activeDatabaseExists)

    if (requiresProtectedRecovery) {
      await mkdir(directory)
      await writeExclusiveSyncedFile(
        join(directory, RESTORE_WORKSPACE_MARKER),
        `${RESTORE_APPLICATION}:${journal.operationId}\n`
      )
      await restoreProtectedBackup(paths, journal, join(directory, RESTORE_DISPLACED_DATABASE_FILE))
      assertCompatibleDatabaseFile(paths.databaseFile)
      await removeRestoreOperation(paths, journal)
      return 'rolled-back'
    }

    if (!activeDatabaseExists) {
      throw new SafeSqliteRestoreError(
        'restore-unavailable',
        'Fatebound found an interrupted restore without an active or previous database'
      )
    }
    assertCompatibleDatabaseFile(paths.databaseFile)
    await unlink(journalFile(paths))
    return 'rolled-back'
  }

  await assertOwnedRestoreWorkspace(paths, journal)

  if (journal.phase === 'completed') {
    let activeDatabaseValid = true
    try {
      assertCompatibleDatabaseFile(paths.databaseFile)
    } catch {
      activeDatabaseValid = false
    }

    if (!activeDatabaseValid) {
      await rollBackInterruptedRestore(paths, journal)
      await removeRestoreOperation(paths, journal)
      return 'rolled-back'
    }

    await removeRestoreOperation(paths, journal)
    return 'completed'
  }

  await rollBackInterruptedRestore(paths, journal)
  await removeRestoreOperation(paths, journal)
  return 'rolled-back'
}

export async function abandonPreparedSqliteRestore(
  paths: StoragePaths,
  prepared: PreparedSqliteRestore
): Promise<void> {
  if (prepared.journal.phase === 'replacing' || prepared.journal.phase === 'completed') {
    throw new SafeSqliteRestoreError(
      'restore-unavailable',
      'A started SQLite replacement must be recovered rather than abandoned'
    )
  }
  await removeRestoreOperation(paths, prepared.journal)
}
