import type { Stats } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { crc32 } from 'node:zlib'
import type { Readable } from 'node:stream'
import * as yauzl from 'yauzl'
import {
  FATEWORLD_LIMITS,
  validateFateworldContract,
  validateFateworldInternalPath,
  type FateworldValidationError,
  type FateworldValidationErrorCode,
  type FateworldValidationResult
} from './fateworld-contract.ts'

type ArchiveEntryKind = 'directory' | 'file'

interface SeenArchiveEntry {
  readonly displayPath: string
  readonly kind: ArchiveEntryKind
}

interface ReadEntryResult {
  readonly entry?: yauzl.Entry
  readonly ended: boolean
}

function invalid(
  code: FateworldValidationErrorCode,
  message: string,
  entry?: string
): FateworldValidationResult {
  const error: FateworldValidationError =
    entry === undefined ? { code, message } : { code, message, entry }
  return { valid: false, errors: [error] }
}

function openZip(packagePath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(
      packagePath,
      {
        autoClose: false,
        lazyEntries: true,
        decodeStrings: true,
        validateEntrySizes: true,
        strictFileNames: true
      },
      (error, zipFile) => {
        if (error || zipFile === undefined) {
          reject(error ?? new Error('ZIP unavailable'))
          return
        }
        resolve(zipFile)
      }
    )
  })
}

function nextEntry(zipFile: yauzl.ZipFile): Promise<ReadEntryResult> {
  return new Promise((resolve, reject) => {
    const onEntry = (entry: yauzl.Entry): void => {
      cleanup()
      resolve({ entry, ended: false })
    }
    const onEnd = (): void => {
      cleanup()
      resolve({ ended: true })
    }
    const onError = (error: Error): void => {
      cleanup()
      reject(error)
    }
    const cleanup = (): void => {
      zipFile.off('entry', onEntry)
      zipFile.off('end', onEnd)
      zipFile.off('error', onError)
    }

    zipFile.once('entry', onEntry)
    zipFile.once('end', onEnd)
    zipFile.once('error', onError)
    zipFile.readEntry()
  })
}

function openEntryStream(zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || stream === undefined) {
        reject(error ?? new Error('ZIP entry unavailable'))
        return
      }
      resolve(stream)
    })
  })
}

async function readEntryContents(zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
  const stream = await openEntryStream(zipFile, entry)
  const chunks: Buffer[] = []
  let observedBytes = 0
  let observedCrc = 0

  for await (const rawChunk of stream) {
    const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk as Uint8Array)
    observedBytes += chunk.length
    if (observedBytes > FATEWORLD_LIMITS.maximumFileBytes) {
      throw Object.assign(new Error('entry exceeded the configured size while streaming'), {
        code: 'FATEWORLD_ENTRY_TOO_LARGE'
      })
    }
    observedCrc = crc32(chunk, observedCrc)
    chunks.push(chunk)
  }

  if (observedBytes !== entry.uncompressedSize) {
    throw new Error('uncompressed entry size mismatch')
  }
  if ((observedCrc >>> 0) !== (entry.crc32 >>> 0)) {
    throw Object.assign(new Error('entry CRC mismatch'), { code: 'FATEWORLD_CRC_MISMATCH' })
  }

  return Buffer.concat(chunks, observedBytes)
}

function archiveErrorResult(error: unknown): FateworldValidationResult {
  const message = error instanceof Error ? error.message : ''
  if (
    message.includes('invalid relative path') ||
    message.includes('absolute path') ||
    message.includes('backslash')
  ) {
    return invalid('UNSAFE_PATH', 'El ZIP contiene una ruta interna no segura.')
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'FATEWORLD_CRC_MISMATCH'
  ) {
    return invalid('CHECKSUM_MISMATCH', 'El contenido de una entrada no coincide con su CRC declarado.')
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'FATEWORLD_ENTRY_TOO_LARGE'
  ) {
    return invalid('ENTRY_TOO_LARGE', 'Una entrada supera el límite descomprimido durante la lectura.')
  }
  return invalid('INVALID_ZIP', 'El archivo no es un ZIP válido o está dañado.')
}

function validateEntryKind(
  entry: yauzl.Entry,
  isDirectory: boolean
): FateworldValidationResult | undefined {
  const hostSystem = entry.versionMadeBy >>> 8
  const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff
  const unixType = unixMode & 0xf000
  const dosAttributes = entry.externalFileAttributes & 0xffff
  const hasWindowsReparsePoint = (dosAttributes & 0x0400) !== 0
  const isUnixSpecialType = [0x1000, 0x2000, 0x6000, 0xa000, 0xc000].includes(unixType)

  if (hasWindowsReparsePoint || isUnixSpecialType) {
    return invalid(
      'DANGEROUS_ENTRY',
      'El ZIP contiene una entrada de redirección no admitida.',
      entry.fileName
    )
  }

  if (hostSystem === 3) {
    const isRegularUnixFile = unixType === 0 || unixType === 0x8000
    const isUnixDirectory = unixType === 0x4000
    if (
      (!isDirectory && !isRegularUnixFile) ||
      (isDirectory && unixType !== 0 && !isUnixDirectory)
    ) {
      return invalid(
        'DANGEROUS_ENTRY',
        'El ZIP contiene un enlace o tipo de entrada especial no admitido.',
        entry.fileName
      )
    }
  }

  if (isDirectory && (entry.uncompressedSize !== 0 || entry.compressedSize !== 0)) {
    return invalid(
      'DANGEROUS_ENTRY',
      'Una entrada de directorio contiene datos inesperados.',
      entry.fileName
    )
  }

  return undefined
}

function isSupportedFilePath(path: string): boolean {
  if (path === 'manifest.yaml') return true
  if (path.startsWith('content/') && path.endsWith('.md')) return true
  if (path.startsWith('data/') && path.endsWith('.yaml')) return true
  if (path.startsWith('locales/') && path.endsWith('.yaml')) return true
  if (path.startsWith('assets/images/')) {
    return ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(path))
  }
  return false
}

function findFileDirectoryConflict(
  entries: ReadonlyMap<string, SeenArchiveEntry>
): FateworldValidationResult | undefined {
  for (const [canonicalPath, seenEntry] of entries) {
    const segments = canonicalPath.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      const parent = entries.get(segments.slice(0, index).join('/'))
      if (parent?.kind === 'file') {
        return invalid(
          'WINDOWS_PATH_COLLISION',
          `"${seenEntry.displayPath}" intenta usar un archivo como directorio.`,
          seenEntry.displayPath
        )
      }
    }
  }

  for (const [canonicalPath, seenEntry] of entries) {
    if (
      seenEntry.kind === 'directory' &&
      ![...entries.keys()].some((candidate) => candidate.startsWith(`${canonicalPath}/`))
    ) {
      return invalid(
        'UNDECLARED_RESOURCE',
        `El directorio "${seenEntry.displayPath}" no contiene archivos declarables.`,
        seenEntry.displayPath
      )
    }
  }

  return undefined
}

export async function validateFateworldPackage(packagePath: string): Promise<FateworldValidationResult> {
  if (extname(packagePath).toLowerCase() !== '.fateworld') {
    return invalid('INVALID_EXTENSION', 'El paquete debe usar la extensión .fateworld.')
  }

  let packageStats: Stats
  try {
    packageStats = await stat(packagePath)
  } catch {
    return invalid('PACKAGE_UNREADABLE', 'No se pudo leer el paquete seleccionado.')
  }

  if (!packageStats.isFile()) {
    return invalid('PACKAGE_UNREADABLE', 'El paquete seleccionado no es un archivo regular.')
  }
  if (packageStats.size > FATEWORLD_LIMITS.maximumArchiveBytes) {
    return invalid(
      'PACKAGE_TOO_LARGE',
      `El paquete supera el límite de ${FATEWORLD_LIMITS.maximumArchiveBytes} bytes comprimidos.`
    )
  }

  let zipFile: yauzl.ZipFile
  try {
    zipFile = await openZip(packagePath)
  } catch (error) {
    return archiveErrorResult(error)
  }

  try {
    if (zipFile.fileSize > FATEWORLD_LIMITS.maximumArchiveBytes) {
      return invalid(
        'PACKAGE_TOO_LARGE',
        `El paquete supera el límite de ${FATEWORLD_LIMITS.maximumArchiveBytes} bytes comprimidos.`
      )
    }
    if (zipFile.entryCount > FATEWORLD_LIMITS.maximumEntries) {
      return invalid(
        'TOO_MANY_ENTRIES',
        `El paquete supera el límite de ${FATEWORLD_LIMITS.maximumEntries} entradas ZIP.`
      )
    }

    const files = new Map<string, Buffer>()
    const seenEntries = new Map<string, SeenArchiveEntry>()
    let observedEntries = 0
    let totalUncompressedBytes = 0

    while (true) {
      const next = await nextEntry(zipFile)
      if (next.ended) break
      const entry = next.entry as yauzl.Entry
      observedEntries += 1
      if (observedEntries > FATEWORLD_LIMITS.maximumEntries) {
        return invalid(
          'TOO_MANY_ENTRIES',
          `El paquete supera el límite de ${FATEWORLD_LIMITS.maximumEntries} entradas ZIP.`
        )
      }

      const isDirectory = entry.fileName.endsWith('/')
      const path = isDirectory ? entry.fileName.slice(0, -1) : entry.fileName
      const pathResult = validateFateworldInternalPath(path)
      if (!pathResult.valid) {
        return invalid('UNSAFE_PATH', pathResult.reason, entry.fileName)
      }

      const priorEntry = seenEntries.get(pathResult.canonicalKey)
      if (priorEntry !== undefined) {
        const code = priorEntry.displayPath === path ? 'DUPLICATE_ENTRY' : 'WINDOWS_PATH_COLLISION'
        return invalid(
          code,
          `Las entradas "${priorEntry.displayPath}" y "${path}" colisionan dentro del paquete.`,
          path
        )
      }
      seenEntries.set(pathResult.canonicalKey, {
        displayPath: path,
        kind: isDirectory ? 'directory' : 'file'
      })

      const kindError = validateEntryKind(entry, isDirectory)
      if (kindError) return kindError
      if (isDirectory) continue

      if (!isSupportedFilePath(path)) {
        return invalid(
          'UNSUPPORTED_FILE_TYPE',
          'El paquete contiene un archivo o ubicación no admitidos por el formato v1.',
          path
        )
      }
      if (entry.isEncrypted()) {
        return invalid('ENCRYPTED_ENTRY', 'El formato v1 no admite entradas cifradas.', path)
      }
      if (entry.compressionMethod !== 0 && entry.compressionMethod !== 8) {
        return invalid(
          'UNSUPPORTED_COMPRESSION',
          'El formato v1 solo admite entradas almacenadas o Deflate.',
          path
        )
      }
      if (
        !Number.isSafeInteger(entry.uncompressedSize) ||
        !Number.isSafeInteger(entry.compressedSize) ||
        entry.uncompressedSize > FATEWORLD_LIMITS.maximumFileBytes
      ) {
        return invalid(
          'ENTRY_TOO_LARGE',
          `Una entrada supera el límite de ${FATEWORLD_LIMITS.maximumFileBytes} bytes descomprimidos.`,
          path
        )
      }

      totalUncompressedBytes += entry.uncompressedSize
      if (totalUncompressedBytes > FATEWORLD_LIMITS.maximumUncompressedBytes) {
        return invalid(
          'PACKAGE_CONTENT_TOO_LARGE',
          `El paquete supera el límite total de ${FATEWORLD_LIMITS.maximumUncompressedBytes} bytes descomprimidos.`
        )
      }

      if (
        entry.uncompressedSize > 0 &&
        (entry.compressedSize === 0 ||
          entry.uncompressedSize > entry.compressedSize * FATEWORLD_LIMITS.maximumCompressionRatio)
      ) {
        return invalid(
          'SUSPICIOUS_COMPRESSION_RATIO',
          `La entrada supera la relación máxima de compresión ${FATEWORLD_LIMITS.maximumCompressionRatio}:1.`,
          path
        )
      }

      files.set(path, await readEntryContents(zipFile, entry))
    }

    const conflict = findFileDirectoryConflict(seenEntries)
    if (conflict) return conflict

    return validateFateworldContract({
      files,
      fileCount: files.size,
      uncompressedBytes: totalUncompressedBytes
    })
  } catch (error) {
    return archiveErrorResult(error)
  } finally {
    zipFile.close()
  }
}

export type {
  FateworldPackageInfo,
  FateworldBasicPackageInfo,
  FateworldBasicTable,
  FateworldTable,
  FateworldTableEntry,
  FateworldTableReference,
  FateworldValidationError,
  FateworldValidationErrorCode,
  FateworldValidationResult
} from './fateworld-contract.ts'
