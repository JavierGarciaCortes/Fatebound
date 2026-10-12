import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { crc32 } from 'node:zlib'

const repositoryRoot = resolve(import.meta.dirname, '..')
const sourceDirectory = join(repositoryRoot, 'examples', 'fateworld', 'echoes-of-the-tide')
const outputFile = join(
  repositoryRoot,
  'examples',
  'fateworld',
  'echoes-of-the-tide-1.0.0.fateworld'
)

const ZIP_VERSION = 20
const UTF8_FLAG = 0x0800
const STORED_METHOD = 0
const DOS_TIME = 0
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1
const REGULAR_FILE_ATTRIBUTES = (0o100644 << 16) >>> 0

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- .mjs cannot use TypeScript return annotations.
async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error(`The example source cannot contain links: ${entry.name}`)
    }
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(absolutePath)))
    } else if (entry.isFile()) {
      files.push(absolutePath)
    } else {
      throw new Error(`Unsupported example source entry: ${entry.name}`)
    }
  }

  return files
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- .mjs cannot use TypeScript return annotations.
function createLocalHeader(name, contents, checksum) {
  const nameBytes = Buffer.from(name, 'utf8')
  const header = Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50, 0)
  header.writeUInt16LE(ZIP_VERSION, 4)
  header.writeUInt16LE(UTF8_FLAG, 6)
  header.writeUInt16LE(STORED_METHOD, 8)
  header.writeUInt16LE(DOS_TIME, 10)
  header.writeUInt16LE(DOS_DATE, 12)
  header.writeUInt32LE(checksum, 14)
  header.writeUInt32LE(contents.length, 18)
  header.writeUInt32LE(contents.length, 22)
  header.writeUInt16LE(nameBytes.length, 26)
  header.writeUInt16LE(0, 28)
  return Buffer.concat([header, nameBytes, contents])
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- .mjs cannot use TypeScript return annotations.
function createCentralHeader(name, contents, checksum, localOffset) {
  const nameBytes = Buffer.from(name, 'utf8')
  const header = Buffer.alloc(46)
  header.writeUInt32LE(0x02014b50, 0)
  header.writeUInt16LE((3 << 8) | ZIP_VERSION, 4)
  header.writeUInt16LE(ZIP_VERSION, 6)
  header.writeUInt16LE(UTF8_FLAG, 8)
  header.writeUInt16LE(STORED_METHOD, 10)
  header.writeUInt16LE(DOS_TIME, 12)
  header.writeUInt16LE(DOS_DATE, 14)
  header.writeUInt32LE(checksum, 16)
  header.writeUInt32LE(contents.length, 20)
  header.writeUInt32LE(contents.length, 24)
  header.writeUInt16LE(nameBytes.length, 28)
  header.writeUInt16LE(0, 30)
  header.writeUInt16LE(0, 32)
  header.writeUInt16LE(0, 34)
  header.writeUInt16LE(0, 36)
  header.writeUInt32LE(REGULAR_FILE_ATTRIBUTES, 38)
  header.writeUInt32LE(localOffset, 42)
  return Buffer.concat([header, nameBytes])
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- .mjs cannot use TypeScript return annotations.
function createEndRecord(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22)
  record.writeUInt32LE(0x06054b50, 0)
  record.writeUInt16LE(0, 4)
  record.writeUInt16LE(0, 6)
  record.writeUInt16LE(entryCount, 8)
  record.writeUInt16LE(entryCount, 10)
  record.writeUInt32LE(centralSize, 12)
  record.writeUInt32LE(centralOffset, 16)
  record.writeUInt16LE(0, 20)
  return record
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- .mjs cannot use TypeScript return annotations.
async function buildPackage() {
  const sourceStats = await stat(sourceDirectory)
  if (!sourceStats.isDirectory()) throw new Error('The example source directory is missing')

  const sourceFiles = (await listSourceFiles(sourceDirectory)).sort((left, right) =>
    left.localeCompare(right, 'en')
  )
  const localParts = []
  const centralParts = []
  let localOffset = 0

  for (const absolutePath of sourceFiles) {
    const name = relative(sourceDirectory, absolutePath).split(sep).join('/')
    const contents = await readFile(absolutePath)
    const checksum = crc32(contents) >>> 0
    const localPart = createLocalHeader(name, contents, checksum)
    const centralPart = createCentralHeader(name, contents, checksum, localOffset)
    localParts.push(localPart)
    centralParts.push(centralPart)
    localOffset += localPart.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const archive = Buffer.concat([
    ...localParts,
    centralDirectory,
    createEndRecord(sourceFiles.length, centralDirectory.length, localOffset)
  ])

  await mkdir(dirname(outputFile), { recursive: true })
  await writeFile(outputFile, archive)
  process.stdout.write(`${relative(repositoryRoot, outputFile)}\n`)
}

await buildPackage()
