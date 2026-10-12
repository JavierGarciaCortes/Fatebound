import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { FATEWORLD_LIMITS, type FateworldValidationErrorCode } from './fateworld-contract.ts'
import { createStoredTestZip, type TestZipEntry } from './fateworld-test-zip.ts'
import { validateFateworldPackage } from './fateworld-validator.ts'

const VALID_MANIFEST = `formatVersion: '1'
world:
  id: com.fatebound.samples.test-world
  version: 1.0.0
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

const VALID_TABLES = `tables:
  - id: origins
    titles:
      es: Orígenes
    entries:
      - id: first-light
        texts:
          es: Una luz aparece en el horizonte.
        references:
          - tableId: omens
            entryId: quiet-bell
  - id: omens
    titles:
      es: Presagios
    entries:
      - id: quiet-bell
        texts:
          es: Una campana permanece en silencio.
        references: []
`

function validEntries(overrides: Partial<Record<string, Buffer | string>> = {}): TestZipEntry[] {
  const files: Record<string, Buffer | string> = {
    'manifest.yaml': VALID_MANIFEST,
    'content/es/description.md': '# Mundo de prueba\n\nContenido original.\n',
    'data/tables.yaml': VALID_TABLES,
    ...overrides
  }

  return Object.entries(files).map(([name, contents]) => ({ name, contents }))
}

async function validateTemporaryPackage(
  archive: Buffer,
  extension = '.fateworld'
): Promise<Awaited<ReturnType<typeof validateFateworldPackage>>> {
  const directory = await mkdtemp(join(tmpdir(), 'fatebound-fateworld-test-'))
  const packagePath = join(directory, `package${extension}`)
  try {
    await writeFile(packagePath, archive)
    return await validateFateworldPackage(packagePath)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function assertRejected(
  result: Awaited<ReturnType<typeof validateFateworldPackage>>,
  expectedCode: FateworldValidationErrorCode
): void {
  assert.equal(result.valid, false)
  if (result.valid) return
  assert.equal(result.errors[0]?.code, expectedCode)
}

test('accepts the original reproducible Fateworld v1 sample', async () => {
  const result = await validateFateworldPackage(
    resolve('examples', 'fateworld', 'echoes-of-the-tide-1.0.0.fateworld')
  )

  assert.equal(result.valid, true)
  if (!result.valid) return
  assert.equal(result.package.formatVersion, '1')
  assert.equal(result.package.world.id, 'com.fatebound.samples.echoes-of-the-tide')
  assert.equal(result.package.world.version, '1.0.0')
  assert.deepEqual(result.package.languages, ['es'])
  assert.equal(result.package.tables.length, 2)
})

test('rejects invalid ZIP data, extensions, format versions, and capabilities', async (context) => {
  await context.test('invalid ZIP data', async () => {
    assertRejected(await validateTemporaryPackage(Buffer.from('not a zip')), 'INVALID_ZIP')
  })

  await context.test('wrong extension', async () => {
    assertRejected(await validateTemporaryPackage(createStoredTestZip(validEntries()), '.zip'), 'INVALID_EXTENSION')
  })

  await context.test('unknown format version', async () => {
    const manifest = VALID_MANIFEST.replace("formatVersion: '1'", "formatVersion: '2'")
    assertRejected(
      await validateTemporaryPackage(createStoredTestZip(validEntries({ 'manifest.yaml': manifest }))),
      'UNSUPPORTED_FORMAT_VERSION'
    )
  })

  await context.test('unknown mechanical capability', async () => {
    const manifest = VALID_MANIFEST.replace(
      'requiredCapabilities: []',
      'requiredCapabilities:\n    - mechanics.dice.v1'
    )
    assertRejected(
      await validateTemporaryPackage(createStoredTestZip(validEntries({ 'manifest.yaml': manifest }))),
      'UNSUPPORTED_CAPABILITY'
    )
  })
})

test('rejects unsafe paths, Windows collisions, links, and ZIP limits', async (context) => {
  await context.test('parent traversal', async () => {
    assertRejected(
      await validateTemporaryPackage(
        createStoredTestZip([{ name: '../manifest.yaml', contents: VALID_MANIFEST }])
      ),
      'UNSAFE_PATH'
    )
  })

  await context.test('case-insensitive Windows collision', async () => {
    assertRejected(
      await validateTemporaryPackage(
        createStoredTestZip([
          ...validEntries(),
          { name: 'data/TABLES.yaml', contents: VALID_TABLES }
        ])
      ),
      'WINDOWS_PATH_COLLISION'
    )
  })

  await context.test('duplicate entry', async () => {
    assertRejected(
      await validateTemporaryPackage(
        createStoredTestZip([
          ...validEntries(),
          { name: 'data/tables.yaml', contents: VALID_TABLES }
        ])
      ),
      'DUPLICATE_ENTRY'
    )
  })

  await context.test('symbolic link entry', async () => {
    const entries = validEntries().map((entry) =>
      entry.name === 'data/tables.yaml' ? { ...entry, unixMode: 0o120777 } : entry
    )
    assertRejected(
      await validateTemporaryPackage(createStoredTestZip(entries)),
      'DANGEROUS_ENTRY'
    )
  })

  await context.test('entry count limit', async () => {
    const entries = Array.from({ length: FATEWORLD_LIMITS.maximumEntries + 1 }, (_, index) => ({
      name: `data/entry-${index}.yaml`,
      contents: 'value: safe\n'
    }))
    assertRejected(await validateTemporaryPackage(createStoredTestZip(entries)), 'TOO_MANY_ENTRIES')
  })

  await context.test('uncompressed file size limit', async () => {
    const oversizedContents = Buffer.alloc(FATEWORLD_LIMITS.maximumFileBytes + 1)
    assertRejected(
      await validateTemporaryPackage(
        createStoredTestZip([{ name: 'data/tables.yaml', contents: oversizedContents }])
      ),
      'ENTRY_TOO_LARGE'
    )
  })
})

test('rejects duplicate identifiers and missing table references', async (context) => {
  await context.test('duplicate table identifier', async () => {
    const duplicateTables = VALID_TABLES.replace('id: omens', 'id: origins')
    assertRejected(
      await validateTemporaryPackage(
        createStoredTestZip(validEntries({ 'data/tables.yaml': duplicateTables }))
      ),
      'DUPLICATE_ID'
    )
  })

  await context.test('missing referenced entry', async () => {
    const brokenTables = VALID_TABLES.replace('entryId: quiet-bell', 'entryId: absent-entry')
    assertRejected(
      await validateTemporaryPackage(
        createStoredTestZip(validEntries({ 'data/tables.yaml': brokenTables }))
      ),
      'BROKEN_REFERENCE'
    )
  })
})

test('rejects YAML aliases and explicit tags', async (context) => {
  await context.test('anchor and alias', async () => {
    const manifest = VALID_MANIFEST.replace(
      'titles:\n    es: Mundo de prueba',
      'titles: &titles\n    es: Mundo de prueba'
    ).replace('descriptions:\n    es:', 'descriptions: *titles\n  ignored:')
    assertRejected(
      await validateTemporaryPackage(createStoredTestZip(validEntries({ 'manifest.yaml': manifest }))),
      'INVALID_YAML'
    )
  })

  await context.test('explicit tag', async () => {
    const manifest = VALID_MANIFEST.replace("formatVersion: '1'", "formatVersion: !unsafe '1'")
    assertRejected(
      await validateTemporaryPackage(createStoredTestZip(validEntries({ 'manifest.yaml': manifest }))),
      'INVALID_YAML'
    )
  })
})
