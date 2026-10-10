import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  AUTOMATIC_BACKUP_IDLE_MS,
  AUTOMATIC_BACKUP_MINIMUM_INTERVAL_MS,
  AutomaticSqliteBackupCoordinator,
  loadAutomaticBackupState,
  saveAutomaticBackupState,
  type AutomaticBackupTimerScheduler
} from './sqlite-automatic-backup.ts'
import type { SqliteBackupResult } from './sqlite-backup.ts'
import {
  configurePortableDatabase,
  openSqliteConnection,
  runSqliteWriteTransaction
} from './sqlite-storage.ts'

class FakeClock implements AutomaticBackupTimerScheduler {
  now = 0
  #nextTimer = 1
  readonly #timers = new Map<number, { readonly dueAt: number; readonly callback: () => void }>()

  set(callback: () => void, delayMs: number): number {
    const id = this.#nextTimer++
    this.#timers.set(id, { dueAt: this.now + delayMs, callback })
    return id
  }

  clear(handle: unknown): void {
    this.#timers.delete(handle as number)
  }

  jumpWithoutRunning(milliseconds: number): void {
    this.now += milliseconds
  }

  advance(milliseconds: number): void {
    this.now += milliseconds

    for (;;) {
      const due = [...this.#timers.entries()]
        .filter(([, timer]) => timer.dueAt <= this.now)
        .sort((left, right) => left[1].dueAt - right[1].dueAt)[0]
      if (!due) return
      this.#timers.delete(due[0])
      due[1].callback()
    }
  }
}

function fakeBackupResult(createdAt: string): SqliteBackupResult {
  return {
    directory: 'backup',
    databaseFile: 'backup/fatebound.sqlite',
    manifestFile: 'backup/manifest.json',
    manifest: {
      formatVersion: 2,
      application: 'fatebound',
      id: 'test-backup',
      createdAt,
      reason: 'automatic',
      schemaVersion: 1,
      databaseFile: 'fatebound.sqlite',
      sizeBytes: 1,
      sha256: '0'.repeat(64)
    }
  }
}

function createCoordinator(
  clock: FakeClock,
  createBackup: () => Promise<SqliteBackupResult>,
  options: {
    readonly initialState?: ConstructorParameters<
      typeof AutomaticSqliteBackupCoordinator
    >[0]['initialState']
    readonly persistState?: ConstructorParameters<
      typeof AutomaticSqliteBackupCoordinator
    >[0]['persistState']
    readonly onError?: (error: unknown) => void
  } = {}
): AutomaticSqliteBackupCoordinator {
  return new AutomaticSqliteBackupCoordinator({
    initialState: options.initialState,
    createBackup,
    persistState: options.persistState ?? (async () => undefined),
    onError: options.onError ?? (() => undefined),
    now: () => clock.now,
    timers: clock
  })
}

test('a committed row change schedules one backup after two idle minutes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-auto-commit-'))
  const databaseFile = join(root, 'fatebound.sqlite')
  const database = openSqliteConnection(databaseFile)
  const clock = new FakeClock()
  let backupCount = 0
  const coordinator = createCoordinator(clock, async () => {
    backupCount += 1
    return fakeBackupResult(new Date(clock.now).toISOString())
  })

  try {
    configurePortableDatabase(database)
    database.exec('CREATE TABLE change_probe (value TEXT NOT NULL) STRICT;')
    coordinator.start()

    await runSqliteWriteTransaction(
      database,
      (connection) => connection.prepare('INSERT INTO change_probe VALUES (?)').run('saved'),
      () => coordinator.recordCommittedChange()
    )

    clock.advance(AUTOMATIC_BACKUP_IDLE_MS - 1)
    await coordinator.waitForIdle()
    assert.equal(backupCount, 0)

    clock.advance(1)
    await coordinator.waitForIdle()
    assert.equal(backupCount, 1)
  } finally {
    await coordinator.stop()
    database.close()
    await rm(root, { recursive: true, force: true })
  }
})

test('read-only work and an idle database do not create automatic backups', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-auto-clean-'))
  const database = openSqliteConnection(join(root, 'fatebound.sqlite'))
  const clock = new FakeClock()
  let backupCount = 0
  const coordinator = createCoordinator(clock, async () => {
    backupCount += 1
    return fakeBackupResult(new Date(clock.now).toISOString())
  })

  try {
    configurePortableDatabase(database)
    coordinator.start()
    await runSqliteWriteTransaction(
      database,
      (connection) => connection.prepare('SELECT 1').get(),
      () => coordinator.recordCommittedChange()
    )
    clock.advance(24 * 60 * 60 * 1_000)
    await coordinator.waitForIdle()
    assert.equal(backupCount, 0)
  } finally {
    await coordinator.stop()
    database.close()
    await rm(root, { recursive: true, force: true })
  }
})

test('a rolled-back transaction is not recorded as a persistent modification', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-auto-rollback-'))
  const database = openSqliteConnection(join(root, 'fatebound.sqlite'))
  const clock = new FakeClock()
  let backupCount = 0
  let committedChanges = 0
  const coordinator = createCoordinator(clock, async () => {
    backupCount += 1
    return fakeBackupResult(new Date(clock.now).toISOString())
  })

  try {
    configurePortableDatabase(database)
    database.exec('CREATE TABLE rollback_probe (value TEXT NOT NULL) STRICT;')
    coordinator.start()

    await assert.rejects(
      runSqliteWriteTransaction(
        database,
        (connection) => {
          connection.prepare('INSERT INTO rollback_probe VALUES (?)').run('discarded')
          throw new Error('cancel transaction')
        },
        async () => {
          committedChanges += 1
          await coordinator.recordCommittedChange()
        }
      ),
      /cancel transaction/
    )

    clock.advance(AUTOMATIC_BACKUP_IDLE_MS)
    await coordinator.waitForIdle()
    assert.equal(committedChanges, 0)
    assert.equal(backupCount, 0)
    assert.equal(
      (database.prepare('SELECT COUNT(*) AS count FROM rollback_probe').get() as { count: number })
        .count,
      0
    )
  } finally {
    await coordinator.stop()
    database.close()
    await rm(root, { recursive: true, force: true })
  }
})

test('new changes reset idle time and respect thirty minutes between automatic backups', async () => {
  const clock = new FakeClock()
  let backupCount = 0
  const coordinator = createCoordinator(clock, async () => {
    backupCount += 1
    return fakeBackupResult(new Date(clock.now).toISOString())
  })
  coordinator.start()

  await coordinator.recordCommittedChange()
  clock.advance(AUTOMATIC_BACKUP_IDLE_MS - 10_000)
  await coordinator.recordCommittedChange()
  clock.advance(9_999)
  assert.equal(backupCount, 0)
  clock.advance(AUTOMATIC_BACKUP_IDLE_MS - 9_999)
  await coordinator.waitForIdle()
  assert.equal(backupCount, 1)

  clock.advance(1_000)
  await coordinator.recordCommittedChange()
  clock.advance(AUTOMATIC_BACKUP_MINIMUM_INTERVAL_MS - 1_001)
  await coordinator.waitForIdle()
  assert.equal(backupCount, 1)
  clock.advance(1)
  await coordinator.waitForIdle()
  assert.equal(backupCount, 2)
  await coordinator.stop()
})

test('simultaneous backup evaluations share the same in-flight backup', async () => {
  const clock = new FakeClock()
  let backupCount = 0
  let releaseBackup: (() => void) | undefined
  const blocked = new Promise<void>((resolve) => {
    releaseBackup = resolve
  })
  const coordinator = createCoordinator(clock, async () => {
    backupCount += 1
    await blocked
    return fakeBackupResult(new Date(clock.now).toISOString())
  })
  coordinator.start()
  await coordinator.recordCommittedChange()
  clock.jumpWithoutRunning(AUTOMATIC_BACKUP_IDLE_MS)

  const first = coordinator.requestBackupEvaluation()
  const second = coordinator.requestBackupEvaluation()
  assert.equal(backupCount, 1)
  releaseBackup?.()
  await Promise.all([first, second])
  assert.equal(backupCount, 1)
  await coordinator.stop()
})

test('shutdown waits for an in-flight backup and starts no replacement backup', async () => {
  const clock = new FakeClock()
  let backupCount = 0
  let releaseBackup: (() => void) | undefined
  const blocked = new Promise<void>((resolve) => {
    releaseBackup = resolve
  })
  const coordinator = createCoordinator(clock, async () => {
    backupCount += 1
    await blocked
    return fakeBackupResult(new Date(clock.now).toISOString())
  })
  coordinator.start()
  await coordinator.recordCommittedChange()
  clock.jumpWithoutRunning(AUTOMATIC_BACKUP_IDLE_MS)
  void coordinator.requestBackupEvaluation()

  let stopped = false
  const stopping = coordinator.stop().then(() => {
    stopped = true
  })
  await Promise.resolve()
  assert.equal(stopped, false)
  assert.equal(backupCount, 1)
  releaseBackup?.()
  await stopping
  clock.advance(AUTOMATIC_BACKUP_MINIMUM_INTERVAL_MS)
  assert.equal(backupCount, 1)
})

test('dirty backup state survives reopening and is cleared only by a valid backup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-auto-state-'))
  const backupsDirectory = join(root, 'backups')
  await mkdir(backupsDirectory)
  const firstClock = new FakeClock()
  const first = createCoordinator(
    firstClock,
    async () => {
      throw new Error('must not run before shutdown')
    },
    {
      persistState: (state) => saveAutomaticBackupState(backupsDirectory, state)
    }
  )

  try {
    first.start()
    await first.recordCommittedChange()
    await first.stop()
    assert.equal((await loadAutomaticBackupState(backupsDirectory)).dirty, true)

    const secondClock = new FakeClock()
    let backupCount = 0
    const second = createCoordinator(
      secondClock,
      async () => {
        backupCount += 1
        return fakeBackupResult(new Date(secondClock.now).toISOString())
      },
      {
        initialState: await loadAutomaticBackupState(backupsDirectory),
        persistState: (state) => saveAutomaticBackupState(backupsDirectory, state)
      }
    )
    second.start()
    secondClock.advance(AUTOMATIC_BACKUP_IDLE_MS)
    await second.waitForIdle()
    assert.equal(backupCount, 1)
    assert.equal((await loadAutomaticBackupState(backupsDirectory)).dirty, false)
    await second.stop()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('an invalid persisted state reports the error and schedules a conservative backup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-auto-invalid-state-'))
  const backupsDirectory = join(root, 'backups')
  await mkdir(backupsDirectory)
  await writeFile(join(backupsDirectory, '.automatic-backup-state.json'), '{ invalid', 'utf8')
  const errors: unknown[] = []

  try {
    const initialState = await loadAutomaticBackupState(backupsDirectory, (error) => {
      errors.push(error)
    })
    assert.equal(initialState.dirty, true)
    assert.equal(errors.length, 1)

    const clock = new FakeClock()
    let backupCount = 0
    const coordinator = createCoordinator(
      clock,
      async () => {
        backupCount += 1
        return fakeBackupResult(new Date(clock.now).toISOString())
      },
      { initialState }
    )
    coordinator.start()
    clock.advance(AUTOMATIC_BACKUP_IDLE_MS)
    await coordinator.waitForIdle()
    assert.equal(backupCount, 1)
    await coordinator.stop()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
