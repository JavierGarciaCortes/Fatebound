import assert from 'node:assert/strict'
import { appendFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createWorldPackageCatalogHandler } from './world-package-catalog-ipc.ts'
import { createStoredTestZip, type TestZipEntry } from './fateworld-test-zip.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'
import {
  MANAGED_WORLD_OWNER_FILE_NAME,
  MANAGED_WORLD_READY_FILE_NAME,
  MANAGED_WORLD_STORE_DIRECTORY_NAME,
  managedWorldOwnerContents,
  managedWorldPackageFileName
} from './world-package-managed-store.ts'
import { readWorldPackageCatalog } from './world-package-catalog.ts'

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
    { name: 'content/es/description.md', contents: '# Mundo de prueba\n' },
    { name: 'data/tables.yaml', contents: VALID_TABLES }
  ]
}

function basicPackageEntries(): TestZipEntry[] {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return [
    {
      name: 'manifest.yaml',
      contents: `formatVersion: '1'
world:
  id: com.fatebound.worlds.ronin
  version: 1.0.0
  titles:
    es: Ronin
  defaultLanguage: es
  languages:
    - es
compatibility:
  engine: basic
  engineVersion: 1.0.0
  requiredCapabilities: []
content:
  descriptions:
    es: content/es/description.md
data:
  gameplay: data/gameplay.yaml
  tables:
    - data/tables/names.yaml
localization:
  catalogs:
    es:
      - locales/es/ui.yaml
      - locales/es/names.yaml
resources:
  images:
    - assets/images/hero.png
    - assets/images/card.png
    - assets/images/emblem.png
  presentation:
    hero: assets/images/hero.png
    card: assets/images/card.png
    emblem: assets/images/emblem.png
`
    },
    { name: 'content/es/description.md', contents: '# Ronin\n' },
    {
      name: 'data/gameplay.yaml',
      contents: `characterCreation:
  nameSelection:
    mode: choice
    options:
      - id: neutral
        tableId: character.names
        labelKey: character.nameOptions.neutral
tableBindings:
  character:
    names: character.names
`
    },
    {
      name: 'data/tables/names.yaml',
      contents: `id: character.names
selector:
  type: d6
entries:
  - id: akira
    when:
      faces:
        - '1'
    outcome:
      kind: proper_name
      data:
        value: Akira
      steps: []
      triggers: []
`
    },
    {
      name: 'locales/es/ui.yaml',
      contents: 'character:\n  nameOptions:\n    neutral: Nombre neutral\n'
    },
    { name: 'locales/es/names.yaml', contents: 'tableId: character.names\ntitle: Nombres\n' },
    { name: 'assets/images/hero.png', contents: png },
    { name: 'assets/images/card.png', contents: png },
    { name: 'assets/images/emblem.png', contents: png }
  ]
}

async function writePackage(
  packagePath: string,
  worldId: string,
  worldVersion: string,
  formatVersion = '1'
): Promise<void> {
  await writeFile(
    packagePath,
    createStoredTestZip(packageEntries(worldId, worldVersion, formatVersion))
  )
}

async function writeManagedSlot(
  inbox: string,
  slotId: string,
  worldId: string,
  worldVersion: string,
  ready: boolean
): Promise<string> {
  const slotPath = join(inbox, MANAGED_WORLD_STORE_DIRECTORY_NAME, slotId)
  await mkdir(slotPath, { recursive: true })
  await writeFile(
    join(slotPath, MANAGED_WORLD_OWNER_FILE_NAME),
    managedWorldOwnerContents(slotId, '00000000-0000-4000-8000-000000000900')
  )
  const packagePath = join(slotPath, managedWorldPackageFileName(slotId))
  await writePackage(packagePath, worldId, worldVersion)
  if (ready) await writeFile(join(slotPath, MANAGED_WORLD_READY_FILE_NAME), '')
  return slotPath
}

test('a missing world package inbox is an empty read-only catalog', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-catalog-missing-'))

  try {
    assert.deepEqual(await readWorldPackageCatalog(join(root, 'worlds')), {
      status: 'ready',
      packages: [],
      issues: [],
      scanLimitReached: false
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('the catalog exposes a structurally valid Basic package as available but not installed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-catalog-basic-'))
  const inbox = join(root, 'worlds')

  try {
    await mkdir(inbox)
    await writeFile(join(inbox, 'ronin.fateworld'), createStoredTestZip(basicPackageEntries()))

    const result = await readWorldPackageCatalog(inbox)

    assert.equal(result.packages.length, 1)
    assert.equal(result.packages[0]?.worldId, 'com.fatebound.worlds.ronin')
    assert.equal(result.packages[0]?.playable, false)
    assert.deepEqual(result.issues, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('the catalog validates direct packages, separates incompatibilities, and rejects duplicate releases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-catalog-'))
  const inbox = join(root, 'worlds')

  try {
    await mkdir(join(inbox, 'nested'), { recursive: true })
    await writePackage(join(inbox, 'duplicate-a.fateworld'), 'com.example.duplicate', '1.0.0')
    await writePackage(join(inbox, 'duplicate-b.fateworld'), 'com.example.duplicate', '1.0.0')
    await writePackage(join(inbox, 'duplicate-v2.fateworld'), 'com.example.duplicate', '2.0.0')
    await writePackage(join(inbox, 'new-world.FATEWORLD'), 'com.example.new-world', '1.3.0')
    await writePackage(join(inbox, 'future-format.fateworld'), 'com.example.future', '1.0.0', '2')
    await writeFile(join(inbox, 'broken.fateworld'), 'still being copied')
    await writePackage(
      join(inbox, 'nested', 'ignored.fateworld'),
      'com.example.nested',
      '1.0.0'
    )
    await writeFile(join(inbox, 'ignored.zip'), 'not inspected')

    const result = await readWorldPackageCatalog(inbox)

    assert.deepEqual(
      result.packages.map((candidate) => [candidate.worldId, candidate.worldVersion]),
      [
        ['com.example.duplicate', '2.0.0'],
        ['com.example.new-world', '1.3.0']
      ]
    )
    assert.equal(result.packages.every((candidate) => candidate.playable === false), true)
    assert.equal(result.packages.some((candidate) => candidate.worldId === 'com.example.nested'), false)
    assert.deepEqual(
      result.issues.map((issue) => issue.kind).sort(),
      ['duplicate', 'incompatible', 'invalid']
    )
    assert.deepEqual(
      result.issues.find((issue) => issue.kind === 'duplicate')?.fileNames,
      ['duplicate-a.fateworld', 'duplicate-b.fateworld']
    )
    assert.equal(
      result.issues.find((issue) => issue.kind === 'incompatible')?.validationCode,
      'UNSUPPORTED_FORMAT_VERSION'
    )
    assert.equal(result.issues.find((issue) => issue.kind === 'invalid')?.retryable, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('managed packages stay invisible until ready and remain subject to structure and package validation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-catalog-managed-'))
  const inbox = join(root, 'worlds')
  const pendingId = '00000000-0000-4000-8000-000000000101'
  const readyId = '00000000-0000-4000-8000-000000000102'
  const damagedId = '00000000-0000-4000-8000-000000000103'
  const unsafeId = '00000000-0000-4000-8000-000000000104'

  try {
    await writeManagedSlot(inbox, pendingId, 'com.example.pending', '1.0.0', false)
    await writeManagedSlot(inbox, readyId, 'com.example.ready', '1.0.0', true)
    const damagedSlot = await writeManagedSlot(
      inbox,
      damagedId,
      'com.example.damaged',
      '1.0.0',
      true
    )
    await writeFile(join(damagedSlot, managedWorldPackageFileName(damagedId)), 'damaged')
    const unsafeSlot = await writeManagedSlot(
      inbox,
      unsafeId,
      'com.example.unsafe',
      '1.0.0',
      true
    )
    await writeFile(join(unsafeSlot, 'unexpected.txt'), 'not part of a managed slot')

    const result = await readWorldPackageCatalog(inbox)

    assert.deepEqual(
      result.packages.map((candidate) => candidate.worldId),
      ['com.example.ready']
    )
    assert.equal(
      result.packages.some((candidate) => candidate.worldId === 'com.example.pending'),
      false
    )
    assert.equal(
      result.issues.some((issue) =>
        issue.fileNames.includes(managedWorldPackageFileName(pendingId))
      ),
      false
    )
    assert.equal(
      result.issues.some(
        (issue) =>
          issue.fileNames.includes(managedWorldPackageFileName(damagedId)) &&
          issue.validationCode === 'INVALID_ZIP'
      ),
      true
    )
    assert.equal(
      result.issues.some(
        (issue) =>
          issue.fileNames.includes(managedWorldPackageFileName(unsafeId)) &&
          issue.validationCode === 'MANAGED_SLOT_UNEXPECTED_STRUCTURE'
      ),
      true
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a package changed while validation is running is rejected as retryable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-catalog-changing-'))
  const inbox = join(root, 'worlds')
  const packagePath = join(inbox, 'changing.fateworld')

  try {
    await mkdir(inbox)
    await writePackage(packagePath, 'com.example.changing', '1.0.0')

    const result = await readWorldPackageCatalog(inbox, {
      async validatePackage(candidatePath) {
        const validation = await validateFateworldPackage(candidatePath)
        await appendFile(candidatePath, Buffer.from([0]))
        return validation
      }
    })

    assert.deepEqual(result.packages, [])
    assert.equal(result.issues[0]?.validationCode, 'PACKAGE_CHANGED_DURING_SCAN')
    assert.equal(result.issues[0]?.retryable, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('symbolic-link package candidates are never followed', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-catalog-link-'))
  const inbox = join(root, 'worlds')
  const outsidePackage = join(root, 'outside.fateworld')
  const outsideSlot = join(root, 'outside-slot')
  const linkedSlotId = '00000000-0000-4000-8000-000000000105'

  try {
    await mkdir(inbox)
    await mkdir(outsideSlot)
    await writePackage(outsidePackage, 'com.example.outside', '1.0.0')
    try {
      await symlink(outsidePackage, join(inbox, 'linked.fateworld'), 'file')
      await mkdir(join(inbox, MANAGED_WORLD_STORE_DIRECTORY_NAME))
      await symlink(
        outsideSlot,
        join(inbox, MANAGED_WORLD_STORE_DIRECTORY_NAME, linkedSlotId),
        'junction'
      )
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        ['EPERM', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')
      ) {
        context.skip('This Windows environment does not permit creating a test symlink.')
        return
      }
      throw error
    }

    const result = await readWorldPackageCatalog(inbox)
    assert.deepEqual(result.packages, [])
    assert.deepEqual(
      result.issues.map((issue) => issue.validationCode).sort(),
      ['MANAGED_SLOT_NOT_REGULAR', 'SOURCE_NOT_REGULAR']
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('the IPC handler sanitizes catalog failures', async () => {
  const observed: unknown[] = []
  const handler = createWorldPackageCatalogHandler(
    async () => {
      throw new Error('D:\\private\\worlds is unavailable')
    },
    (error) => observed.push(error)
  )

  assert.deepEqual(await handler(), { status: 'error', code: 'catalog-unavailable' })
  assert.equal(observed.length, 1)
})
