import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { activateStoragePaths, createStoragePaths } from '../storage/portable-storage.ts'
import {
  closeActiveSqliteDatabase,
  openActiveSqliteDatabase
} from '../storage/sqlite-storage.ts'
import { createStoredTestZip, type TestZipEntry } from './fateworld-test-zip.ts'
import { installWorldPackage, WorldPackageInstallError } from './world-package-install.ts'
import { createWorldPackageInstallHandler } from './world-package-install-ipc.ts'
import { readWorldPackageLibraryCatalog } from './world-package-library.ts'
import {
  createInstalledWorldArtworkResolver,
  createInstalledWorldArtworkUrl
} from './world-package-artwork.ts'
import { readActiveInstalledWorldVersion } from './world-installation-repository.ts'
import {
  INSTALLED_WORLD_PACKAGE_FILE_NAME,
  INSTALLED_WORLD_STORE_DIRECTORY_NAME,
  inspectPublishedInstalledWorldSlot
} from './world-package-installed-store.ts'

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

const TEST_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const TEST_WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
])

function narrativePackageEntries(
  worldId: string,
  worldVersion: string,
  description = 'Contenido original.'
): TestZipEntry[] {
  return [
    {
      name: 'manifest.yaml',
      contents: `formatVersion: '1'
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
    },
    { name: 'content/es/description.md', contents: `# Mundo de prueba\n\n${description}\n` },
    { name: 'data/tables.yaml', contents: VALID_TABLES }
  ]
}

function basicPackageEntries(worldVersion = '1.0.0'): TestZipEntry[] {
  return [
    {
      name: 'manifest.yaml',
      contents: `formatVersion: '1'
world:
  id: com.fatebound.worlds.ronin
  version: ${worldVersion}
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
    - assets/images/hero.webp
    - assets/images/card.webp
    - assets/images/emblem.png
  presentation:
    hero: assets/images/hero.webp
    card: assets/images/card.webp
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
    { name: 'assets/images/hero.webp', contents: TEST_WEBP },
    { name: 'assets/images/card.webp', contents: TEST_WEBP },
    { name: 'assets/images/emblem.png', contents: TEST_PNG }
  ]
}

async function withWorldInstallationRuntime(
  run: (root: string, inbox: string, worldsDirectory: string) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'fatebound-world-install-'))
  const paths = createStoragePaths(join(root, 'data'))
  const inbox = join(root, 'worlds')
  await mkdir(paths.dataDirectory, { recursive: true })
  await mkdir(inbox, { recursive: true })
  activateStoragePaths(paths)
  await openActiveSqliteDatabase()

  try {
    await run(root, inbox, paths.worldsDirectory)
  } finally {
    await closeActiveSqliteDatabase()
    await rm(root, { recursive: true, force: true })
  }
}

test('installs immutable narrative and Basic releases, persists them, and is idempotent', async () => {
  await withWorldInstallationRuntime(async (_root, inbox, worldsDirectory) => {
    const narrativePath = join(inbox, 'example.fateworld')
    const narrativeV2Path = join(inbox, 'example-v2.fateworld')
    const basicPath = join(inbox, 'ronin.fateworld')
    await writeFile(
      narrativePath,
      createStoredTestZip(narrativePackageEntries('com.example.world', '1.0.0'))
    )
    await writeFile(
      narrativeV2Path,
      createStoredTestZip(narrativePackageEntries('com.example.world', '2.0.0'))
    )
    await writeFile(basicPath, createStoredTestZip(basicPackageEntries()))
    const sourceBefore = await readFile(narrativePath)

    assert.equal(
      (
        await installWorldPackage(
          'com.example.world',
          '2.0.0',
          inbox,
          worldsDirectory
        )
      ).status,
      'success'
    )
    assert.equal(
      (
        await installWorldPackage(
          'com.example.world',
          '1.0.0',
          inbox,
          worldsDirectory
        )
      ).status,
      'success'
    )
    assert.equal(
      (
        await installWorldPackage(
          'com.example.world',
          '1.0.0',
          inbox,
          worldsDirectory
        )
      ).status,
      'already-installed'
    )
    assert.equal(
      (
        await installWorldPackage(
          'com.fatebound.worlds.ronin',
          '1.0.0',
          inbox,
          worldsDirectory
        )
      ).status,
      'success'
    )
    assert.deepEqual(await readFile(narrativePath), sourceBefore)

    await closeActiveSqliteDatabase()
    await openActiveSqliteDatabase()

    const catalog = await readWorldPackageLibraryCatalog(inbox, worldsDirectory)
    assert.deepEqual(
      catalog.packages.map((packageInfo) => [
        packageInfo.worldId,
        packageInfo.worldVersion,
        packageInfo.installationStatus,
        packageInfo.playable
      ]),
      [
        ['com.example.world', '1.0.0', 'installed', false],
        ['com.example.world', '2.0.0', 'installed', false],
        ['com.fatebound.worlds.ronin', '1.0.0', 'installed', false]
      ]
    )
    assert.deepEqual(catalog.issues, [])

    const installedRonin = catalog.packages.find(
      (packageInfo) => packageInfo.worldId === 'com.fatebound.worlds.ronin'
    )
    const installedArtwork = installedRonin?.artwork
    assert.ok(installedArtwork)
    assert.equal(installedArtwork.hero.includes(worldsDirectory), false)
    assert.equal(installedArtwork.hero.includes(INSTALLED_WORLD_PACKAGE_FILE_NAME), false)
    let artworkInspections = 0
    const resolveArtwork = createInstalledWorldArtworkResolver(() => worldsDirectory, {
      async inspectInstallation(directory, record, validatePackage) {
        artworkInspections += 1
        return inspectPublishedInstalledWorldSlot(directory, record, validatePackage)
      }
    })
    const artworkRoles = ['hero', 'card', 'emblem'] as const
    const resolvedArtwork = await Promise.all(
      artworkRoles.map((role) => resolveArtwork(installedArtwork[role]))
    )
    assert.deepEqual(
      resolvedArtwork.map((artwork) => artwork?.mimeType),
      ['image/webp', 'image/webp', 'image/png']
    )
    assert.deepEqual(resolvedArtwork[0]?.contents, TEST_WEBP)
    assert.deepEqual(resolvedArtwork[1]?.contents, TEST_WEBP)
    assert.deepEqual(resolvedArtwork[2]?.contents, TEST_PNG)
    assert.equal(artworkInspections, 1)
    const roninRecord = await readActiveInstalledWorldVersion(
      'com.fatebound.worlds.ronin',
      '1.0.0'
    )
    assert.ok(roninRecord)
    assert.equal(
      await resolveArtwork(
        createInstalledWorldArtworkUrl(
          'com.example.world',
          '1.0.0',
          roninRecord.packageSha256,
          'hero'
        )
      ),
      undefined
    )
    assert.equal(
      await resolveArtwork(
        createInstalledWorldArtworkUrl(
          'com.fatebound.worlds.ronin',
          '2.0.0',
          roninRecord.packageSha256,
          'hero'
        )
      ),
      undefined
    )
    assert.equal(
      await resolveArtwork(installedArtwork.hero.replace('/hero', '/undeclared')),
      undefined
    )
    assert.equal(
      await resolveArtwork(
        installedArtwork.hero.replace(
          roninRecord.packageSha256,
          '0'.repeat(64)
        )
      ),
      undefined
    )
  })
})

test('rejects different bytes for an installed world ID and version', async () => {
  await withWorldInstallationRuntime(async (_root, inbox, worldsDirectory) => {
    const packagePath = join(inbox, 'world.fateworld')
    await writeFile(
      packagePath,
      createStoredTestZip(narrativePackageEntries('com.example.conflict', '1.0.0'))
    )
    await installWorldPackage('com.example.conflict', '1.0.0', inbox, worldsDirectory)
    await writeFile(
      packagePath,
      createStoredTestZip(
        narrativePackageEntries('com.example.conflict', '1.0.0', 'Contenido distinto.')
      )
    )

    await assert.rejects(
      installWorldPackage('com.example.conflict', '1.0.0', inbox, worldsDirectory),
      (error: unknown) =>
        error instanceof WorldPackageInstallError && error.code === 'version-conflict'
    )
  })
})

test('keeps a post-publication database failure visible as an orphan but not installed', async () => {
  await withWorldInstallationRuntime(async (_root, inbox, worldsDirectory) => {
    await writeFile(
      join(inbox, 'world.fateworld'),
      createStoredTestZip(narrativePackageEntries('com.example.partial', '1.0.0'))
    )

    await assert.rejects(
      installWorldPackage('com.example.partial', '1.0.0', inbox, worldsDirectory, {
        async registerInstallation() {
          throw new Error('simulated SQLite failure')
        }
      }),
      (error: unknown) =>
        error instanceof WorldPackageInstallError && error.code === 'database-unavailable'
    )

    const catalog = await readWorldPackageLibraryCatalog(inbox, worldsDirectory)
    assert.equal(catalog.packages[0]?.installationStatus, 'available')
    assert.equal(
      catalog.issues.some(
        (issue) => issue.validationCode === 'ORPHANED_INSTALLATION_SLOT'
      ),
      true
    )
  })
})

test('does not expose a SQLite installation whose managed package is missing', async () => {
  await withWorldInstallationRuntime(async (_root, inbox, worldsDirectory) => {
    await writeFile(
      join(inbox, 'world.fateworld'),
      createStoredTestZip(basicPackageEntries())
    )
    await installWorldPackage('com.fatebound.worlds.ronin', '1.0.0', inbox, worldsDirectory)
    const installedCatalog = await readWorldPackageLibraryCatalog(inbox, worldsDirectory)
    const installedArtworkUrl = installedCatalog.packages[0]?.artwork?.hero
    assert.ok(installedArtworkUrl)
    const resolveArtwork = createInstalledWorldArtworkResolver(() => worldsDirectory)
    assert.ok(await resolveArtwork(installedArtworkUrl))

    const record = await readActiveInstalledWorldVersion(
      'com.fatebound.worlds.ronin',
      '1.0.0'
    )
    assert.ok(record)
    await rm(
      join(
        worldsDirectory,
        INSTALLED_WORLD_STORE_DIRECTORY_NAME,
        record.storageSlotId,
        INSTALLED_WORLD_PACKAGE_FILE_NAME
      )
    )

    assert.equal(await resolveArtwork(installedArtworkUrl), undefined)
    const catalog = await readWorldPackageLibraryCatalog(inbox, worldsDirectory)
    assert.equal(catalog.packages[0]?.installationStatus, 'available')
    assert.equal(catalog.packages[0]?.artwork, undefined)
    assert.equal(
      catalog.issues.some(
        (issue) => issue.validationCode === 'INSTALLED_PACKAGE_INVALID'
      ),
      true
    )
  })
})

test('the install IPC accepts only release identity and serializes confirmations', async () => {
  let finishInstallation: (() => void) | undefined
  const handler = createWorldPackageInstallHandler(async (worldId, worldVersion) => {
    await new Promise<void>((resolve) => {
      finishInstallation = resolve
    })
    return { status: 'success', worldId, worldVersion }
  })

  assert.deepEqual(await handler({ path: 'C:\\unsafe.fateworld' }, '1.0.0'), {
    status: 'error',
    code: 'package-unavailable'
  })
  const first = handler('com.example.world', '1.0.0')
  assert.deepEqual(await handler('com.example.world', '1.0.0'), {
    status: 'error',
    code: 'install-in-progress'
  })
  assert.ok(finishInstallation)
  finishInstallation()
  assert.equal((await first).status, 'success')
})
