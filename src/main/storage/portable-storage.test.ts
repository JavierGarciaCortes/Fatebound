import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import {
  createStoragePaths,
  probeStorageWriteAccess,
  resolveDefaultStoragePaths,
  resolveWorldPackageInboxDirectory,
  type WriteProbeOperations,
  type WriteProbeResult
} from './portable-storage.ts'
import { prepareStorageForStartup, type StorageFailureAction } from './storage-startup.ts'

const writableResult = (): WriteProbeResult => ({ writable: true })
const deniedResult = (): WriteProbeResult => ({
  writable: false,
  error: Object.assign(new Error('Permission denied'), { code: 'EACCES' })
})

test('resolves an isolated local data directory in development', () => {
  const appPath = resolve('test-fixtures', 'project')
  const paths = resolveDefaultStoragePaths({
    isPackaged: false,
    appPath,
    executablePath: resolve('ignored', 'Fatebound.exe')
  })

  assert.equal(paths.dataDirectory, join(appPath, '.fatebound-dev', 'data'))
  assert.equal(paths.worldsDirectory, join(paths.dataDirectory, 'worlds'))
  assert.equal(paths.backupsDirectory, join(paths.dataDirectory, 'backups'))
  assert.equal(paths.exportsDirectory, join(paths.dataDirectory, 'exports'))
  assert.equal(paths.databaseFile, join(paths.dataDirectory, 'fatebound.sqlite'))
  assert.equal(
    resolveWorldPackageInboxDirectory({
      isPackaged: false,
      appPath,
      executablePath: resolve('ignored', 'Fatebound.exe')
    }),
    join(appPath, '.fatebound-dev', 'worlds')
  )
})

test('uses PORTABLE_EXECUTABLE_DIR instead of the temporary extraction path', () => {
  const portableExecutableDirectory = resolve('test-fixtures', 'portable')
  const paths = resolveDefaultStoragePaths({
    isPackaged: true,
    appPath: resolve('ignored', 'app'),
    executablePath: join(portableExecutableDirectory, 'temporary', 'Fatebound.exe'),
    portableExecutableDirectory
  })

  assert.equal(paths.dataDirectory, join(portableExecutableDirectory, 'data'))
  assert.equal(
    resolveWorldPackageInboxDirectory({
      isPackaged: true,
      appPath: resolve('ignored', 'app'),
      executablePath: join(portableExecutableDirectory, 'temporary', 'Fatebound.exe'),
      portableExecutableDirectory
    }),
    join(portableExecutableDirectory, 'worlds')
  )
})

test('falls back to the executable directory for a packaged application', () => {
  const executablePath = resolve('test-fixtures', 'unpacked', 'Fatebound.exe')
  const paths = resolveDefaultStoragePaths({
    isPackaged: true,
    appPath: resolve('ignored', 'app'),
    executablePath
  })

  assert.equal(paths.dataDirectory, join(dirname(executablePath), 'data'))
  assert.equal(
    resolveWorldPackageInboxDirectory({
      isPackaged: true,
      appPath: resolve('ignored', 'app'),
      executablePath
    }),
    join(dirname(executablePath), 'worlds')
  )
})

test('accepts a writable directory without leaving probe files', async () => {
  const testRoot = await mkdtemp(join(tmpdir(), 'fatebound-storage-test-'))
  const dataDirectory = join(testRoot, 'nested', 'data')

  try {
    const result = await probeStorageWriteAccess(dataDirectory)

    assert.deepEqual(result, { writable: true })
    assert.deepEqual(await readdir(dataDirectory), [])
  } finally {
    await rm(testRoot, { recursive: true, force: true })
  }
})

test('rejects a non-writable directory and attempts safe cleanup', async () => {
  const removedFiles: string[] = []
  const operations: WriteProbeOperations = {
    createDirectory() {
      return Promise.resolve()
    },
    writeProbeFile() {
      return Promise.reject(Object.assign(new Error('Permission denied'), { code: 'EACCES' }))
    },
    async removeProbeFile(filePath) {
      removedFiles.push(filePath)
    }
  }

  const result = await probeStorageWriteAccess(resolve('virtual', 'denied'), {
    operations,
    tokenFactory: () => 'denied'
  })

  assert.equal(result.writable, false)
  assert.equal(removedFiles.length, 1)
  assert.match(removedFiles[0], /\.fatebound-write-probe-denied\.tmp$/)
})

test('treats a probe cleanup failure as a non-writable location', async () => {
  const operations: WriteProbeOperations = {
    createDirectory() {
      return Promise.resolve()
    },
    writeProbeFile() {
      return Promise.resolve()
    },
    async removeProbeFile() {
      throw Object.assign(new Error('Cleanup denied'), { code: 'EACCES' })
    }
  }

  const result = await probeStorageWriteAccess(resolve('virtual', 'cleanup-denied'), {
    operations,
    tokenFactory: () => 'cleanup-denied'
  })

  assert.equal(result.writable, false)
})

test('retries the same location after permissions are corrected', async () => {
  const defaultPaths = createStoragePaths(resolve('virtual', 'default'))
  let attempts = 0

  const result = await prepareStorageForStartup(defaultPaths, {
    async probeWriteAccess(directory) {
      assert.equal(directory, defaultPaths.dataDirectory)
      attempts += 1
      return attempts === 1 ? deniedResult() : writableResult()
    },
    async requestFailureAction() {
      return 'retry'
    },
    async chooseAlternativeDirectory() {
      assert.fail('The directory chooser must not open during a retry')
    }
  })

  assert.equal(attempts, 2)
  assert.deepEqual(result, { status: 'ready', paths: defaultPaths, source: 'default' })
})

test('validates and uses an alternative directory for the current session', async () => {
  const defaultPaths = createStoragePaths(resolve('virtual', 'default'))
  const alternativeDirectory = resolve('virtual', 'alternative')
  const checkedDirectories: string[] = []

  const result = await prepareStorageForStartup(defaultPaths, {
    async probeWriteAccess(directory) {
      checkedDirectories.push(directory)
      return directory === alternativeDirectory ? writableResult() : deniedResult()
    },
    async requestFailureAction() {
      return 'choose-directory'
    },
    async chooseAlternativeDirectory() {
      return alternativeDirectory
    }
  })

  assert.deepEqual(checkedDirectories, [defaultPaths.dataDirectory, alternativeDirectory])
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') {
    assert.equal(result.paths.dataDirectory, alternativeDirectory)
    assert.equal(result.source, 'session-override')
  }
})

test('allows canceling folder selection and exiting without storage', async () => {
  const defaultPaths = createStoragePaths(resolve('virtual', 'default'))
  const actions: StorageFailureAction[] = ['choose-directory', 'exit']
  let probeAttempts = 0
  let chooserAttempts = 0

  const result = await prepareStorageForStartup(defaultPaths, {
    async probeWriteAccess() {
      probeAttempts += 1
      return deniedResult()
    },
    async requestFailureAction() {
      const action = actions.shift()
      assert.ok(action)
      return action
    },
    async chooseAlternativeDirectory() {
      chooserAttempts += 1
      return null
    }
  })

  assert.deepEqual(result, { status: 'exit' })
  assert.equal(probeAttempts, 1)
  assert.equal(chooserAttempts, 1)
})
