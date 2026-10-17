import type { DatabaseSync } from 'node:sqlite'

export interface SqliteMigration {
  readonly version: number
  readonly name: string
  readonly sql: string
}

const MIGRATIONS_TABLE = 'fatebound_schema_migrations'

export const SQLITE_MIGRATIONS: readonly SqliteMigration[] = Object.freeze([
  Object.freeze({
    version: 1,
    name: 'initialize_migration_tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS fatebound_schema_migrations (
        version INTEGER PRIMARY KEY CHECK (version > 0),
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
    `
  }),
  Object.freeze({
    version: 2,
    name: 'install_world_versions',
    sql: `
      CREATE TABLE installed_world_versions (
        world_id TEXT NOT NULL,
        world_version TEXT NOT NULL,
        format_version TEXT NOT NULL CHECK (format_version = '1'),
        profile TEXT NOT NULL CHECK (profile IN ('narrative', 'basic')),
        package_sha256 TEXT NOT NULL CHECK (
          length(package_sha256) = 64 AND
          package_sha256 NOT GLOB '*[^0-9a-f]*'
        ),
        package_size_bytes INTEGER NOT NULL CHECK (
          package_size_bytes > 0 AND package_size_bytes <= 33554432
        ),
        storage_slot_id TEXT NOT NULL UNIQUE,
        installed_at TEXT NOT NULL,
        PRIMARY KEY (world_id, world_version)
      ) STRICT;

      CREATE INDEX installed_world_versions_world_id
        ON installed_world_versions (world_id);
    `
  })
])

interface AppliedMigrationRow {
  readonly version: number
  readonly name: string
}

export interface SqliteMigrationPlan {
  readonly currentVersion: number
  readonly pendingMigrations: readonly SqliteMigration[]
}

function validateMigrationManifest(migrations: readonly SqliteMigration[]): void {
  migrations.forEach((migration, index) => {
    const expectedVersion = index + 1

    if (migration.version !== expectedVersion) {
      throw new Error(
        `SQLite migrations must be contiguous and start at 1; expected ${expectedVersion}, received ${migration.version}`
      )
    }

    if (migration.name.trim() === '') {
      throw new Error(`SQLite migration ${migration.version} must have a name`)
    }
  })
}

function hasMigrationsTable(database: DatabaseSync): boolean {
  const row = database
    .prepare("SELECT 1 AS present FROM sqlite_schema WHERE type = 'table' AND name = ?")
    .get(MIGRATIONS_TABLE)

  return row !== undefined
}

function readAppliedMigrations(database: DatabaseSync): readonly AppliedMigrationRow[] {
  if (!hasMigrationsTable(database)) return []

  return database
    .prepare(`SELECT version, name FROM ${MIGRATIONS_TABLE} ORDER BY version`)
    .all() as unknown as AppliedMigrationRow[]
}

function validateAppliedMigrations(
  appliedMigrations: readonly AppliedMigrationRow[],
  migrations: readonly SqliteMigration[]
): void {
  for (const [index, appliedMigration] of appliedMigrations.entries()) {
    const expectedMigration = migrations[index]

    if (!expectedMigration) {
      throw new Error(
        `The database schema version ${appliedMigration.version} is newer than this Fatebound build supports`
      )
    }

    if (
      appliedMigration.version !== expectedMigration.version ||
      appliedMigration.name !== expectedMigration.name
    ) {
      throw new Error(
        `SQLite migration history does not match version ${expectedMigration.version} (${expectedMigration.name})`
      )
    }
  }
}

function applyMigration(database: DatabaseSync, migration: SqliteMigration): void {
  database.exec('BEGIN IMMEDIATE')

  try {
    database.exec(migration.sql)
    database
      .prepare(`INSERT INTO ${MIGRATIONS_TABLE} (version, name) VALUES (?, ?)`)
      .run(migration.version, migration.name)
    database.exec('COMMIT')
  } catch (error) {
    if (database.isTransaction) database.exec('ROLLBACK')

    throw new Error(`SQLite migration ${migration.version} (${migration.name}) failed`, {
      cause: error
    })
  }
}

export function applySqliteMigrations(
  database: DatabaseSync,
  migrations: readonly SqliteMigration[] = SQLITE_MIGRATIONS
): void {
  const plan = getSqliteMigrationPlan(database, migrations)

  for (const migration of plan.pendingMigrations) {
    applyMigration(database, migration)
  }
}

export function getSqliteMigrationPlan(
  database: DatabaseSync,
  migrations: readonly SqliteMigration[] = SQLITE_MIGRATIONS
): SqliteMigrationPlan {
  validateMigrationManifest(migrations)

  const appliedMigrations = readAppliedMigrations(database)
  validateAppliedMigrations(appliedMigrations, migrations)

  return Object.freeze({
    currentVersion: appliedMigrations.at(-1)?.version ?? 0,
    pendingMigrations: Object.freeze(migrations.slice(appliedMigrations.length))
  })
}
