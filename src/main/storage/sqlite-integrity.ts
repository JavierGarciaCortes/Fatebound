import type { DatabaseSync } from 'node:sqlite'

export type SqliteIntegrityCheck = 'quick' | 'full'

function readIntegrityMessages(
  database: DatabaseSync,
  check: SqliteIntegrityCheck
): readonly string[] {
  const pragma = check === 'quick' ? 'quick_check' : 'integrity_check'
  const rows = database.prepare(`PRAGMA ${pragma}`).all() as unknown as ReadonlyArray<
    Readonly<Record<string, unknown>>
  >

  return rows.map((row) => {
    const value = Object.values(row)[0]
    return typeof value === 'string' ? value : String(value)
  })
}

export function assertSqliteIntegrity(database: DatabaseSync, check: SqliteIntegrityCheck): void {
  let messages: readonly string[]

  try {
    messages = readIntegrityMessages(database, check)
  } catch (error) {
    throw new Error(`SQLite ${check}_check could not be completed`, { cause: error })
  }

  if (messages.length !== 1 || messages[0] !== 'ok') {
    throw new Error(`SQLite ${check}_check failed: ${messages.join('; ') || 'no result'}`)
  }
}

export function assertNoSqliteForeignKeyViolations(database: DatabaseSync): void {
  let violations: readonly unknown[]

  try {
    violations = database.prepare('PRAGMA foreign_key_check').all()
  } catch (error) {
    throw new Error('SQLite foreign_key_check could not be completed', { cause: error })
  }

  if (violations.length > 0) {
    throw new Error(`SQLite foreign_key_check found ${violations.length} violation(s)`)
  }
}

export function validateSqliteDatabase(database: DatabaseSync, check: SqliteIntegrityCheck): void {
  assertSqliteIntegrity(database, check)
  assertNoSqliteForeignKeyViolations(database)
}
