import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { SqliteBackupResult } from './sqlite-backup.ts'

export const AUTOMATIC_BACKUP_IDLE_MS = 2 * 60 * 1_000
export const AUTOMATIC_BACKUP_MINIMUM_INTERVAL_MS = 30 * 60 * 1_000

const AUTOMATIC_BACKUP_STATE_FILE = '.automatic-backup-state.json'

export interface AutomaticBackupState {
  readonly formatVersion: 1
  readonly application: 'fatebound'
  readonly dirty: boolean
  readonly lastAutomaticBackupAt?: string
}

export interface AutomaticBackupTimerScheduler {
  set(callback: () => void, delayMs: number): unknown
  clear(handle: unknown): void
}

export interface AutomaticSqliteBackupCoordinatorOptions {
  readonly initialState?: AutomaticBackupState
  readonly createBackup: () => Promise<SqliteBackupResult>
  readonly persistState: (state: AutomaticBackupState) => Promise<void>
  readonly onError: (error: unknown) => void
  readonly now?: () => number
  readonly timers?: AutomaticBackupTimerScheduler
}

const SYSTEM_TIMERS: AutomaticBackupTimerScheduler = {
  set(callback, delayMs) {
    const timer = setTimeout(callback, delayMs)
    timer.unref()
    return timer
  },
  clear(handle) {
    clearTimeout(handle as NodeJS.Timeout)
  }
}

function cleanAutomaticBackupState(): AutomaticBackupState {
  return Object.freeze({ formatVersion: 1, application: 'fatebound', dirty: false })
}

function conservativeAutomaticBackupState(): AutomaticBackupState {
  return Object.freeze({ formatVersion: 1, application: 'fatebound', dirty: true })
}

function parseAutomaticBackupState(value: unknown): AutomaticBackupState | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const state = value as Record<string, unknown>
  if (
    state.formatVersion !== 1 ||
    state.application !== 'fatebound' ||
    typeof state.dirty !== 'boolean'
  ) {
    return undefined
  }

  if (state.lastAutomaticBackupAt !== undefined) {
    if (typeof state.lastAutomaticBackupAt !== 'string') return undefined
    try {
      if (new Date(state.lastAutomaticBackupAt).toISOString() !== state.lastAutomaticBackupAt) {
        return undefined
      }
    } catch {
      return undefined
    }
  }

  return Object.freeze({
    formatVersion: 1,
    application: 'fatebound',
    dirty: state.dirty,
    ...(typeof state.lastAutomaticBackupAt === 'string'
      ? { lastAutomaticBackupAt: state.lastAutomaticBackupAt }
      : {})
  })
}

export async function loadAutomaticBackupState(
  backupsDirectory: string,
  onError: (error: unknown) => void = () => undefined
): Promise<AutomaticBackupState> {
  try {
    const value = JSON.parse(
      await readFile(join(resolve(backupsDirectory), AUTOMATIC_BACKUP_STATE_FILE), 'utf8')
    )
    const state = parseAutomaticBackupState(value)
    if (state) return state

    onError(new Error('The automatic SQLite backup state is invalid'))
    return conservativeAutomaticBackupState()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return cleanAutomaticBackupState()
    onError(error)
    return conservativeAutomaticBackupState()
  }
}

export async function saveAutomaticBackupState(
  backupsDirectory: string,
  state: AutomaticBackupState
): Promise<void> {
  const directory = resolve(backupsDirectory)
  const stateFile = join(directory, AUTOMATIC_BACKUP_STATE_FILE)
  const temporaryFile = join(directory, `.automatic-backup-state-${randomUUID()}.tmp`)
  await mkdir(directory, { recursive: true })

  try {
    await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx'
    })
    await rename(temporaryFile, stateFile)
  } catch (error) {
    await rm(temporaryFile, { force: true }).catch(() => undefined)
    throw error
  }
}

export class AutomaticSqliteBackupCoordinator {
  readonly #createBackup: () => Promise<SqliteBackupResult>
  readonly #persistState: (state: AutomaticBackupState) => Promise<void>
  readonly #onError: (error: unknown) => void
  readonly #now: () => number
  readonly #timers: AutomaticBackupTimerScheduler
  #dirty: boolean
  #lastAutomaticBackupAt: number | undefined
  #lastChangeAt: number | undefined
  #changeGeneration = 0
  #timer: unknown
  #backupPromise: Promise<void> | undefined
  #started = false
  #closing = false

  constructor(options: AutomaticSqliteBackupCoordinatorOptions) {
    this.#createBackup = options.createBackup
    this.#persistState = options.persistState
    this.#onError = options.onError
    this.#now = options.now ?? Date.now
    this.#timers = options.timers ?? SYSTEM_TIMERS
    this.#dirty = options.initialState?.dirty ?? false
    this.#lastAutomaticBackupAt = options.initialState?.lastAutomaticBackupAt
      ? Date.parse(options.initialState.lastAutomaticBackupAt)
      : undefined
  }

  get isDirty(): boolean {
    return this.#dirty
  }

  start(): void {
    if (this.#started || this.#closing) return
    this.#started = true

    if (this.#dirty) {
      this.#lastChangeAt = this.#now()
      this.#schedule()
    }
  }

  async recordCommittedChange(): Promise<void> {
    if (this.#closing) {
      throw new Error('Cannot record a SQLite change while Fatebound is closing')
    }

    this.#dirty = true
    this.#changeGeneration += 1
    this.#lastChangeAt = this.#now()
    this.#schedule()
    await this.#persistCurrentState()
  }

  requestBackupEvaluation(): Promise<void> {
    if (this.#backupPromise) return this.#backupPromise
    if (!this.#started || this.#closing || !this.#dirty) return Promise.resolve()

    const remainingDelay = this.#remainingDelay()
    if (remainingDelay > 0) {
      this.#schedule()
      return Promise.resolve()
    }

    const generationAtStart = this.#changeGeneration
    const backupPromise = (async () => {
      try {
        await this.#createBackup()
        this.#lastAutomaticBackupAt = this.#now()
        this.#dirty = this.#changeGeneration !== generationAtStart
        await this.#persistCurrentState()
        if (this.#dirty) this.#schedule()
      } catch (error) {
        this.#onError(error)
      }
    })()

    this.#backupPromise = backupPromise.finally(() => {
      this.#backupPromise = undefined
    })
    return this.#backupPromise
  }

  async stop(): Promise<void> {
    this.#closing = true
    this.#clearTimer()
    await this.#backupPromise
  }

  async waitForIdle(): Promise<void> {
    await this.#backupPromise
  }

  #remainingDelay(): number {
    const now = this.#now()
    const idleDeadline = (this.#lastChangeAt ?? now) + AUTOMATIC_BACKUP_IDLE_MS
    const intervalDeadline =
      (this.#lastAutomaticBackupAt ?? Number.NEGATIVE_INFINITY) +
      AUTOMATIC_BACKUP_MINIMUM_INTERVAL_MS
    return Math.max(0, Math.max(idleDeadline, intervalDeadline) - now)
  }

  #schedule(): void {
    if (!this.#started || this.#closing || !this.#dirty || this.#backupPromise) return
    this.#clearTimer()
    this.#timer = this.#timers.set(() => {
      this.#timer = undefined
      void this.requestBackupEvaluation()
    }, this.#remainingDelay())
  }

  #clearTimer(): void {
    if (this.#timer === undefined) return
    this.#timers.clear(this.#timer)
    this.#timer = undefined
  }

  async #persistCurrentState(): Promise<void> {
    const state: AutomaticBackupState = Object.freeze({
      formatVersion: 1,
      application: 'fatebound',
      dirty: this.#dirty,
      ...(this.#lastAutomaticBackupAt !== undefined
        ? { lastAutomaticBackupAt: new Date(this.#lastAutomaticBackupAt).toISOString() }
        : {})
    })

    try {
      await this.#persistState(state)
    } catch (error) {
      this.#onError(error)
    }
  }
}
