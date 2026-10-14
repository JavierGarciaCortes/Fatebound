import assert from 'node:assert/strict'
import {
  appendFile,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { createWorldPackageAddHandler } from './world-package-add-ipc.ts'
import {
  addWorldPackageToInbox,
  WorldPackageAddError
} from './world-package-add.ts'
import { createStoredTestZip, type TestZipEntry } from './fateworld-test-zip.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'
import {
  MANAGED_WORLD_OWNER_FILE_NAME,
  MANAGED_WORLD_READY_FILE_NAME,
  MANAGED_WORLD_STORE_DIRECTORY_NAME,
  managedWorldPackageFileName
} from './world-package-managed-store.ts'
import { readWorldPackageCatalog } from './world-package-catalog.ts'
import { createWorldPackageOpenDialogOptions } from './world-package-selector.ts'

const VALID_TABLES = `tables:
  - id: origins
    titles:
      es: Origenes
    entries:
      - id: first-light
        texts:
          es: Una luz aparece en el horizonte.
        references: []
`

function packageEntries(
  worldId: string,
  worldVersion: string,
  description = 'Contenido original.',
  formatVersion = '1'
): TestZipEntry[] {
  const manifest = `formatVersion: '${formatVersion}'
world:
  id: ${worldId}
  version: ${worldVersion}
  titles:
    es: Mundo de prueba
  defaultLanguage: es
  languages:
    - es
compatibility:
  requiredCapabilities: []
content:
  descriptions:
    es: content/es/description.md
data:
  tables: data/tables.yaml
resources:
  images: []
`

  return [
    { name: 'manifest.yaml', contents: manifest },
    { name: 'content/es/description.md', contents: `# Mundo de prueba\n\n${description}\n` },
    { name: 'data/tables.yaml', contents: VALID_TABLES }
  ]
}

async function writePackage(
  packagePath: string,
  worldId: string,
  worldVersion: string,
  description = 'Contenido original.',
  formatVersion = '1'
): Promise<void> {
  await writeFile(
    packagePath,
    createStoredTestZip(packageEntries(worldId, worldVersion, description, formatVersion))
  )
}

function publicationError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`Publication failed with ${code}`), { code })
}

test('publishes a fully validated managed package and preserves the selected source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-add-'))
  const source = join(root, 'selected.fateworld')
  const inbox = join(root, 'portable', 'worlds')

  try {
    await writePackage(source, 'com.fatebound.worlds.ronin', '1.0.0')
    const sourceBefore = await readFile(source)
    const slotId = '00000000-0000-4000-8000-000000000001'
    let preparedCopyValidated = false
    const result = await addWorldPackageToInbox(source, inbox, {
      tokenFactory: () => slotId,
      async validatePackage(packagePath) {
        const validation = await validateFateworldPackage(packagePath)
        if (packagePath.includes(MANAGED_WORLD_STORE_DIRECTORY_NAME)) {
          preparedCopyValidated = true
        }
        return validation
      },
      async publishReady(readyPath) {
        assert.equal(preparedCopyValidated, true)
        await writeFile(readyPath, '', { flag: 'wx' })
      }
    })

    assert.deepEqual(result, {
      status: 'success',
      worldId: 'com.fatebound.worlds.ronin',
      worldVersion: '1.0.0'
    })
    assert.equal(preparedCopyValidated, true)
    assert.deepEqual(await readFile(source), sourceBefore)
    assert.deepEqual(await readdir(inbox), [MANAGED_WORLD_STORE_DIRECTORY_NAME])
    assert.deepEqual(
      (await readdir(join(inbox, MANAGED_WORLD_STORE_DIRECTORY_NAME, slotId))).sort(),
      [
        managedWorldPackageFileName(slotId),
        MANAGED_WORLD_OWNER_FILE_NAME,
        MANAGED_WORLD_READY_FILE_NAME
      ]
    )
    const catalog = await readWorldPackageCatalog(inbox)
    assert.deepEqual(
      catalog.packages.map((candidate) => [candidate.worldId, candidate.worldVersion]),
      [['com.fatebound.worlds.ronin', '1.0.0']]
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('does not duplicate identical releases, rejects changed same-version content, and allows another version', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-conflict-'))
  const inbox = join(root, 'worlds')
  const existing = join(inbox, 'existing.fateworld')
  const identical = join(root, 'identical.fateworld')
  const conflicting = join(root, 'conflicting.fateworld')
  const nextVersion = join(root, 'next.fateworld')
  const conflictingNextVersion = join(root, 'conflicting-next.fateworld')

  try {
    await mkdir(inbox)
    await writePackage(existing, 'com.fatebound.worlds.ninja', '1.0.0')
    await copyFile(existing, identical)
    await writePackage(
      conflicting,
      'com.fatebound.worlds.ninja',
      '1.0.0',
      'Contenido distinto.'
    )
    await writePackage(nextVersion, 'com.fatebound.worlds.ninja', '2.0.0')
    await writePackage(
      conflictingNextVersion,
      'com.fatebound.worlds.ninja',
      '2.0.0',
      'Otra version 2.'
    )

    assert.deepEqual(await addWorldPackageToInbox(existing, inbox), {
      status: 'already-available',
      worldId: 'com.fatebound.worlds.ninja',
      worldVersion: '1.0.0'
    })
    assert.deepEqual(await addWorldPackageToInbox(identical, inbox), {
      status: 'already-available',
      worldId: 'com.fatebound.worlds.ninja',
      worldVersion: '1.0.0'
    })
    await assert.rejects(
      addWorldPackageToInbox(conflicting, inbox),
      (error: unknown) =>
        error instanceof WorldPackageAddError && error.code === 'version-conflict'
    )
    assert.equal((await addWorldPackageToInbox(nextVersion, inbox)).status, 'success')
    assert.equal((await addWorldPackageToInbox(nextVersion, inbox)).status, 'already-available')
    await assert.rejects(
      addWorldPackageToInbox(conflictingNextVersion, inbox),
      (error: unknown) =>
        error instanceof WorldPackageAddError && error.code === 'version-conflict'
    )

    await copyFile(nextVersion, join(inbox, 'manual-v2.fateworld'))
    const catalog = await readWorldPackageCatalog(inbox)
    assert.equal(catalog.packages.length, 1)
    assert.equal(
      catalog.issues.some(
        (issue) =>
          issue.kind === 'duplicate' &&
          issue.worldId === 'com.fatebound.worlds.ninja' &&
          issue.worldVersion === '2.0.0'
      ),
      true
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects invalid and incompatible selected packages before publishing files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-invalid-'))
  const inbox = join(root, 'worlds')
  const invalid = join(root, 'invalid.fateworld')
  const incompatible = join(root, 'incompatible.fateworld')

  try {
    await writeFile(invalid, 'not a package')
    await writePackage(incompatible, 'com.example.future', '1.0.0', 'Future', '2')

    await assert.rejects(
      addWorldPackageToInbox(invalid, inbox),
      (error: unknown) =>
        error instanceof WorldPackageAddError && error.code === 'invalid-package'
    )
    await assert.rejects(
      addWorldPackageToInbox(incompatible, inbox),
      (error: unknown) =>
        error instanceof WorldPackageAddError && error.code === 'incompatible-package'
    )
    await assert.rejects(readdir(inbox), { code: 'ENOENT' })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects a selected package that changes during validation without publishing it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-changing-'))
  const source = join(root, 'changing.fateworld')
  const inbox = join(root, 'worlds')

  try {
    await writePackage(source, 'com.fatebound.worlds.robot', '1.0.0')
    await assert.rejects(
      addWorldPackageToInbox(source, inbox, {
        async validatePackage(packagePath) {
          const result = await validateFateworldPackage(packagePath)
          await appendFile(packagePath, Buffer.from([0]))
          return result
        }
      }),
      (error: unknown) =>
        error instanceof WorldPackageAddError && error.code === 'package-changed'
    )
    await assert.rejects(readdir(inbox), { code: 'ENOENT' })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a failure before ready publishes nothing and removes only its owned slot', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-before-ready-'))
  const source = join(root, 'selected.fateworld')
  const inbox = join(root, 'worlds')
  const existing = join(inbox, 'existing.fateworld')

  try {
    await mkdir(inbox)
    await writePackage(source, 'com.fatebound.worlds.soldado', '1.0.0')
    await writePackage(existing, 'com.fatebound.worlds.ronin', '1.0.0')
    const sourceBefore = await readFile(source)
    const existingBefore = await readFile(existing)

    await assert.rejects(
      addWorldPackageToInbox(source, inbox, {
        tokenFactory: () => '00000000-0000-4000-8000-000000000010',
        async publishReady() {
          throw publicationError('EPERM')
        }
      }),
      (error: unknown) =>
        error instanceof WorldPackageAddError && error.code === 'copy-failed'
    )

    assert.deepEqual(await readFile(source), sourceBefore)
    assert.deepEqual(await readFile(existing), existingBefore)
    assert.deepEqual((await readdir(inbox)).sort(), [
      MANAGED_WORLD_STORE_DIRECTORY_NAME,
      'existing.fateworld'
    ])
    assert.deepEqual(await readdir(join(inbox, MANAGED_WORLD_STORE_DIRECTORY_NAME)), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a failure after ready is resolved through the catalog and never removes the package', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-after-ready-'))
  const source = join(root, 'selected.fateworld')
  const inbox = join(root, 'worlds')
  const slotId = '00000000-0000-4000-8000-000000000011'
  let readyPath: string | undefined

  try {
    await writePackage(source, 'com.fatebound.worlds.shaolin', '1.0.0')

    const result = await addWorldPackageToInbox(source, inbox, {
      tokenFactory: () => slotId,
      async publishReady(markerPath) {
        readyPath = markerPath
        await writeFile(markerPath, '', { flag: 'wx' })
        throw publicationError('EIO')
      }
    })

    assert.equal(result.status, 'success')
    assert.ok(readyPath)
    assert.equal(dirname(readyPath), join(inbox, MANAGED_WORLD_STORE_DIRECTORY_NAME, slotId))
    assert.deepEqual(
      (await readWorldPackageCatalog(inbox)).packages.map((candidate) => candidate.worldId),
      ['com.fatebound.worlds.shaolin']
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('slot collisions preserve the existing directory and do not publish a package', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-slot-collision-'))
  const source = join(root, 'selected.fateworld')
  const inbox = join(root, 'worlds')
  const slotId = '00000000-0000-4000-8000-000000000012'
  const slotPath = join(inbox, MANAGED_WORLD_STORE_DIRECTORY_NAME, slotId)
  const sentinelPath = join(slotPath, 'sentinel.txt')

  try {
    await writePackage(source, 'com.fatebound.worlds.templario', '1.0.0')
    await mkdir(slotPath, { recursive: true })
    await writeFile(sentinelPath, 'external contents')

    await assert.rejects(
      addWorldPackageToInbox(source, inbox, { tokenFactory: () => slotId }),
      (error: unknown) =>
        error instanceof WorldPackageAddError && error.code === 'copy-failed'
    )

    assert.equal(await readFile(sentinelPath, 'utf8'), 'external contents')
    assert.deepEqual(await readdir(slotPath), ['sentinel.txt'])
    assert.deepEqual((await readWorldPackageCatalog(inbox)).packages, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('the no-argument add handler preserves cancellation and serializes selection', async () => {
  let addCalls = 0
  const cancelledHandler = createWorldPackageAddHandler(
    async () => undefined,
    async () => {
      addCalls += 1
      return { status: 'success', worldId: 'unreachable', worldVersion: '1.0.0' }
    }
  )
  assert.deepEqual(await cancelledHandler(), { status: 'cancelled' })
  assert.equal(addCalls, 0)

  let finish: (() => void) | undefined
  const firstOperation = new Promise<void>((resolve) => {
    finish = resolve
  })
  const serializedHandler = createWorldPackageAddHandler(
    async () => 'C:\\private\\selected.fateworld',
    async () => {
      await firstOperation
      return { status: 'success', worldId: 'com.example.safe', worldVersion: '1.0.0' }
    }
  )

  const pending = serializedHandler()
  await Promise.resolve()
  assert.deepEqual(await serializedHandler(), { status: 'error', code: 'add-in-progress' })
  finish?.()
  assert.equal((await pending).status, 'success')

  const conflictHandler = createWorldPackageAddHandler(
    async () => 'C:\\private\\conflict.fateworld',
    async () => {
      throw new WorldPackageAddError(
        'version-conflict',
        'C:\\private\\conflict.fateworld must not reach the renderer'
      )
    }
  )
  assert.deepEqual(await conflictHandler(), {
    status: 'error',
    code: 'version-conflict'
  })
})

test('the native selector accepts one Fateworld file and no renderer-provided path', () => {
  const options = createWorldPackageOpenDialogOptions({
    title: 'Choose package',
    button: 'Add package',
    fileType: 'Fateworld package'
  })

  assert.deepEqual(options.filters, [
    { name: 'Fateworld package', extensions: ['fateworld'] }
  ])
  assert.deepEqual(options.properties, ['openFile', 'dontAddToRecent'])
  assert.equal(options.properties?.includes('multiSelections'), false)
})
