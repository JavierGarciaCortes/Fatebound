import type { DatabaseSync } from 'node:sqlite'
import {
  runActiveSqliteReadOperation,
  runActiveSqliteWriteTransaction
} from '../storage/sqlite-storage.ts'

export interface InstalledWorldVersionRecord {
  readonly worldId: string
  readonly worldVersion: string
  readonly formatVersion: '1'
  readonly profile: 'narrative' | 'basic'
  readonly packageSha256: string
  readonly packageSizeBytes: number
  readonly storageSlotId: string
  readonly installedAt: string
}

interface InstalledWorldVersionRow {
  readonly world_id: string
  readonly world_version: string
  readonly format_version: string
  readonly profile: string
  readonly package_sha256: string
  readonly package_size_bytes: number
  readonly storage_slot_id: string
  readonly installed_at: string
}

export type InstalledWorldRegistrationResult = 'inserted' | 'identical' | 'conflict'

function toRecord(row: InstalledWorldVersionRow): InstalledWorldVersionRecord {
  if (
    row.format_version !== '1' ||
    (row.profile !== 'narrative' && row.profile !== 'basic')
  ) {
    throw new Error('SQLite contains an unsupported installed world record')
  }

  return Object.freeze({
    worldId: row.world_id,
    worldVersion: row.world_version,
    formatVersion: row.format_version,
    profile: row.profile,
    packageSha256: row.package_sha256,
    packageSizeBytes: row.package_size_bytes,
    storageSlotId: row.storage_slot_id,
    installedAt: row.installed_at
  })
}

export function readInstalledWorldVersion(
  database: DatabaseSync,
  worldId: string,
  worldVersion: string
): InstalledWorldVersionRecord | undefined {
  const row = database
    .prepare(`
      SELECT world_id, world_version, format_version, profile, package_sha256,
             package_size_bytes, storage_slot_id, installed_at
      FROM installed_world_versions
      WHERE world_id = ? AND world_version = ?
    `)
    .get(worldId, worldVersion) as unknown as InstalledWorldVersionRow | undefined

  return row === undefined ? undefined : toRecord(row)
}

export function listInstalledWorldVersions(
  database: DatabaseSync
): readonly InstalledWorldVersionRecord[] {
  return (
    database
      .prepare(`
        SELECT world_id, world_version, format_version, profile, package_sha256,
               package_size_bytes, storage_slot_id, installed_at
        FROM installed_world_versions
        ORDER BY world_id, world_version
      `)
      .all() as unknown as InstalledWorldVersionRow[]
  ).map(toRecord)
}

export function registerInstalledWorldVersion(
  database: DatabaseSync,
  record: InstalledWorldVersionRecord
): InstalledWorldRegistrationResult {
  const existing = readInstalledWorldVersion(database, record.worldId, record.worldVersion)
  if (existing !== undefined) {
    return existing.packageSha256 === record.packageSha256 ? 'identical' : 'conflict'
  }

  database
    .prepare(`
      INSERT INTO installed_world_versions (
        world_id, world_version, format_version, profile, package_sha256,
        package_size_bytes, storage_slot_id, installed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      record.worldId,
      record.worldVersion,
      record.formatVersion,
      record.profile,
      record.packageSha256,
      record.packageSizeBytes,
      record.storageSlotId,
      record.installedAt
    )
  return 'inserted'
}

export function readActiveInstalledWorldVersion(
  worldId: string,
  worldVersion: string
): Promise<InstalledWorldVersionRecord | undefined> {
  return runActiveSqliteReadOperation((database) =>
    readInstalledWorldVersion(database, worldId, worldVersion)
  )
}

export function listActiveInstalledWorldVersions(): Promise<
  readonly InstalledWorldVersionRecord[]
> {
  return runActiveSqliteReadOperation(listInstalledWorldVersions)
}

export function registerActiveInstalledWorldVersion(
  record: InstalledWorldVersionRecord
): Promise<InstalledWorldRegistrationResult> {
  return runActiveSqliteWriteTransaction((database) =>
    registerInstalledWorldVersion(database, record)
  )
}
