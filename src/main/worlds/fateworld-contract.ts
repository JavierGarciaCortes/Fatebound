import { TextDecoder } from 'node:util'
import { parseAllDocuments, visit } from 'yaml'

export const FATEWORLD_FORMAT_VERSION = '1' as const

export const FATEWORLD_LIMITS = Object.freeze({
  maximumArchiveBytes: 32 * 1024 * 1024,
  maximumEntries: 256,
  maximumFileBytes: 8 * 1024 * 1024,
  maximumUncompressedBytes: 64 * 1024 * 1024,
  maximumCompressionRatio: 100,
  maximumPathDepth: 8,
  maximumPathLength: 240,
  maximumPathSegmentLength: 80,
  maximumTables: 128,
  maximumTableEntries: 4096,
  maximumReferences: 8192
})

export type FateworldValidationErrorCode =
  | 'PACKAGE_UNREADABLE'
  | 'INVALID_EXTENSION'
  | 'PACKAGE_TOO_LARGE'
  | 'INVALID_ZIP'
  | 'TOO_MANY_ENTRIES'
  | 'UNSAFE_PATH'
  | 'DUPLICATE_ENTRY'
  | 'WINDOWS_PATH_COLLISION'
  | 'DANGEROUS_ENTRY'
  | 'ENCRYPTED_ENTRY'
  | 'UNSUPPORTED_COMPRESSION'
  | 'ENTRY_TOO_LARGE'
  | 'PACKAGE_CONTENT_TOO_LARGE'
  | 'SUSPICIOUS_COMPRESSION_RATIO'
  | 'CHECKSUM_MISMATCH'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'UNDECLARED_RESOURCE'
  | 'MISSING_RESOURCE'
  | 'INVALID_UTF8'
  | 'INVALID_YAML'
  | 'INVALID_MANIFEST'
  | 'UNSUPPORTED_FORMAT_VERSION'
  | 'UNSUPPORTED_CAPABILITY'
  | 'INVALID_TABLES'
  | 'DUPLICATE_ID'
  | 'BROKEN_REFERENCE'
  | 'INVALID_MARKDOWN'
  | 'INVALID_IMAGE'

export interface FateworldValidationError {
  readonly code: FateworldValidationErrorCode
  readonly message: string
  readonly entry?: string
}

export interface FateworldTableReference {
  readonly tableId: string
  readonly entryId?: string
}

export interface FateworldTableEntry {
  readonly id: string
  readonly texts: Readonly<Record<string, string>>
  readonly references: readonly FateworldTableReference[]
}

export interface FateworldTable {
  readonly id: string
  readonly titles: Readonly<Record<string, string>>
  readonly entries: readonly FateworldTableEntry[]
}

export interface FateworldPackageInfo {
  readonly formatVersion: typeof FATEWORLD_FORMAT_VERSION
  readonly world: {
    readonly id: string
    readonly version: string
    readonly titles: Readonly<Record<string, string>>
  }
  readonly languages: readonly string[]
  readonly defaultLanguage: string
  readonly compatibility: {
    readonly requiredCapabilities: readonly string[]
  }
  readonly content: {
    readonly descriptions: Readonly<Record<string, string>>
  }
  readonly data: {
    readonly tables: string
  }
  readonly resources: {
    readonly images: readonly string[]
  }
  readonly tables: readonly FateworldTable[]
  readonly archive: {
    readonly fileCount: number
    readonly uncompressedBytes: number
  }
}

export type FateworldValidationResult =
  | { readonly valid: true; readonly package: FateworldPackageInfo }
  | { readonly valid: false; readonly errors: readonly FateworldValidationError[] }

export interface ValidatedArchiveContents {
  readonly files: ReadonlyMap<string, Buffer>
  readonly fileCount: number
  readonly uncompressedBytes: number
}

export type InternalPathValidation =
  | { readonly valid: true; readonly canonicalKey: string; readonly segments: readonly string[] }
  | { readonly valid: false; readonly reason: string }

interface ParsedManifest {
  readonly formatVersion: typeof FATEWORLD_FORMAT_VERSION
  readonly world: {
    readonly id: string
    readonly version: string
    readonly titles: Readonly<Record<string, string>>
    readonly defaultLanguage: string
    readonly languages: readonly string[]
  }
  readonly compatibility: {
    readonly requiredCapabilities: readonly string[]
  }
  readonly content: {
    readonly descriptions: Readonly<Record<string, string>>
  }
  readonly data: {
    readonly tables: string
  }
  readonly resources: {
    readonly images: readonly string[]
  }
}

type ParseResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: FateworldValidationError }

const RESERVED_WINDOWS_NAMES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i
const WINDOWS_FORBIDDEN_CHARACTERS = /[<>:"|?*]/
const WORLD_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/
const ELEMENT_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/
const SEMANTIC_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const LANGUAGE_TAG_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/
const REMOTE_MARKDOWN_TARGET =
  /(?:\]\(\s*|^\s*\[[^\]]+\]:\s*)(?:[a-z][a-z0-9+.-]*:|\/\/)/im
const ACTIVE_HTML = /<\/?[A-Za-z][^>]*>/
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

function issue(
  code: FateworldValidationErrorCode,
  message: string,
  entry?: string
): FateworldValidationError {
  return entry === undefined ? { code, message } : { code, message, entry }
}

function success<T>(value: T): ParseResult<T> {
  return { success: true, value }
}

function failure<T>(error: FateworldValidationError): ParseResult<T> {
  return { success: false, error }
}

function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) <= 0x1f) {
      return true
    }
  }

  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function validateExactKeys(
  record: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
  code: FateworldValidationErrorCode,
  entry: string
): FateworldValidationError | undefined {
  const allowed = new Set([...required, ...optional])
  const unknown = Object.keys(record).find((key) => !allowed.has(key))
  if (unknown !== undefined) {
    return issue(code, `${label} contiene el campo no admitido "${unknown}".`, entry)
  }

  const missing = required.find((key) => !hasOwn(record, key))
  if (missing !== undefined) {
    return issue(code, `${label} no contiene el campo obligatorio "${missing}".`, entry)
  }

  return undefined
}

function validateIdentifier(
  value: unknown,
  label: string,
  pattern: RegExp,
  code: FateworldValidationErrorCode,
  entry: string,
  maximumLength = 100
): ParseResult<string> {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) {
    return failure(issue(code, `${label} debe ser una cadena no vacía de hasta ${maximumLength} caracteres.`, entry))
  }

  if (!pattern.test(value)) {
    return failure(issue(code, `${label} no usa un identificador estable admitido.`, entry))
  }

  return success(value)
}

function validateText(
  value: unknown,
  label: string,
  code: FateworldValidationErrorCode,
  entry: string,
  maximumLength = 500
): ParseResult<string> {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximumLength) {
    return failure(issue(code, `${label} debe ser texto no vacío de hasta ${maximumLength} caracteres.`, entry))
  }

  if (value.includes('\u0000')) {
    return failure(issue(code, `${label} contiene caracteres no admitidos.`, entry))
  }

  return success(value)
}

function isSemanticVersion(value: string): boolean {
  if (!SEMANTIC_VERSION_PATTERN.test(value)) return false

  const buildSeparator = value.indexOf('+')
  const versionWithoutBuild = buildSeparator === -1 ? value : value.slice(0, buildSeparator)
  const separator = versionWithoutBuild.indexOf('-')
  if (separator === -1) return true

  return versionWithoutBuild
    .slice(separator + 1)
    .split('.')
    .every((identifier) => !/^\d+$/.test(identifier) || identifier === '0' || !identifier.startsWith('0'))
}

function validateLanguageTag(value: unknown, entry: string): ParseResult<string> {
  if (typeof value !== 'string' || value.length > 35 || !LANGUAGE_TAG_PATTERN.test(value)) {
    return failure(issue('INVALID_MANIFEST', 'El manifiesto contiene una etiqueta de idioma no válida.', entry))
  }

  try {
    const [canonical] = Intl.getCanonicalLocales(value)
    if (canonical !== value) {
      return failure(
        issue('INVALID_MANIFEST', `El idioma "${value}" debe escribirse en su forma canónica "${canonical}".`, entry)
      )
    }
  } catch {
    return failure(issue('INVALID_MANIFEST', `El idioma "${value}" no es una etiqueta BCP 47 válida.`, entry))
  }

  return success(value)
}

function validateLocalizedText(
  value: unknown,
  languages: readonly string[],
  label: string,
  code: FateworldValidationErrorCode,
  entry: string,
  maximumLength: number
): ParseResult<Readonly<Record<string, string>>> {
  if (!isRecord(value)) {
    return failure(issue(code, `${label} debe ser un mapa por idioma.`, entry))
  }

  const keys = Object.keys(value)
  if (keys.length !== languages.length || keys.some((key) => !languages.includes(key))) {
    return failure(issue(code, `${label} debe contener exactamente los idiomas declarados.`, entry))
  }

  const localized: Record<string, string> = Object.create(null) as Record<string, string>
  for (const language of languages) {
    const text = validateText(value[language], `${label}.${language}`, code, entry, maximumLength)
    if (!text.success) return text
    localized[language] = text.value
  }

  return success(Object.freeze(localized))
}

function parseYaml(source: Buffer, entry: string): ParseResult<unknown> {
  let text: string
  try {
    text = utf8Decoder.decode(source)
  } catch {
    return failure(issue('INVALID_UTF8', 'El YAML debe estar codificado como UTF-8 válido.', entry))
  }

  try {
    const documents = parseAllDocuments(text, {
      schema: 'failsafe',
      version: '1.2',
      strict: true,
      uniqueKeys: true,
      merge: false,
      prettyErrors: false,
      stringKeys: true
    })

    if (documents.length !== 1) {
      return failure(issue('INVALID_YAML', 'Cada archivo YAML debe contener exactamente un documento.', entry))
    }

    const document = documents[0]
    if (document.errors.length > 0 || document.warnings.length > 0) {
      return failure(issue('INVALID_YAML', 'El archivo no cumple el subconjunto YAML seguro de Fatebound.', entry))
    }

    let forbiddenConstruction = false
    visit(document, {
      Alias() {
        forbiddenConstruction = true
      },
      Scalar(_key, node) {
        if (node.anchor !== undefined || node.tag !== undefined) forbiddenConstruction = true
      },
      Collection(_key, node) {
        if (node.anchor !== undefined || node.tag !== undefined) forbiddenConstruction = true
      }
    })

    if (forbiddenConstruction) {
      return failure(
        issue('INVALID_YAML', 'El YAML no puede usar alias, anclas ni etiquetas explícitas.', entry)
      )
    }

    return success(document.toJS({ maxAliasCount: 0 }) as unknown)
  } catch {
    return failure(issue('INVALID_YAML', 'No se pudo analizar el YAML seguro del paquete.', entry))
  }
}

export function validateFateworldInternalPath(path: string): InternalPathValidation {
  if (
    path.length === 0 ||
    path.length > FATEWORLD_LIMITS.maximumPathLength ||
    path !== path.normalize('NFC') ||
    path.startsWith('/') ||
    path.endsWith('/') ||
    path.includes('\\') ||
    /^[A-Za-z]:/.test(path)
  ) {
    return { valid: false, reason: 'La ruta debe ser relativa, NFC y usar únicamente separadores "/".' }
  }

  const segments = path.split('/')
  if (segments.length > FATEWORLD_LIMITS.maximumPathDepth) {
    return { valid: false, reason: 'La ruta supera la profundidad máxima permitida.' }
  }

  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment.length > FATEWORLD_LIMITS.maximumPathSegmentLength ||
      segment === '.' ||
      segment === '..' ||
      segment.endsWith('.') ||
      segment.endsWith(' ') ||
      containsControlCharacter(segment) ||
      WINDOWS_FORBIDDEN_CHARACTERS.test(segment) ||
      RESERVED_WINDOWS_NAMES.test(segment)
    ) {
      return { valid: false, reason: 'La ruta contiene un segmento vacío, reservado o no portable.' }
    }
  }

  return {
    valid: true,
    canonicalKey: segments.map((segment) => segment.toLowerCase()).join('/'),
    segments
  }
}

function validateManifest(value: unknown): ParseResult<ParsedManifest> {
  const entry = 'manifest.yaml'
  if (!isRecord(value)) {
    return failure(issue('INVALID_MANIFEST', 'El manifiesto debe ser un mapa YAML.', entry))
  }

  const rootKeys = validateExactKeys(
    value,
    ['formatVersion', 'world', 'compatibility', 'content', 'data', 'resources'],
    [],
    'El manifiesto',
    'INVALID_MANIFEST',
    entry
  )
  if (rootKeys) return failure(rootKeys)

  if (value.formatVersion !== FATEWORLD_FORMAT_VERSION) {
    return failure(
      issue(
        'UNSUPPORTED_FORMAT_VERSION',
        `Fatebound solo admite formatVersion "${FATEWORLD_FORMAT_VERSION}".`,
        entry
      )
    )
  }

  if (!isRecord(value.world)) {
    return failure(issue('INVALID_MANIFEST', 'world debe ser un mapa.', entry))
  }
  const worldKeys = validateExactKeys(
    value.world,
    ['id', 'version', 'titles', 'defaultLanguage', 'languages'],
    [],
    'world',
    'INVALID_MANIFEST',
    entry
  )
  if (worldKeys) return failure(worldKeys)

  const worldId = validateIdentifier(
    value.world.id,
    'world.id',
    WORLD_ID_PATTERN,
    'INVALID_MANIFEST',
    entry
  )
  if (!worldId.success) return worldId

  if (
    typeof value.world.version !== 'string' ||
    value.world.version.length > 100 ||
    !isSemanticVersion(value.world.version)
  ) {
    return failure(
      issue('INVALID_MANIFEST', 'world.version debe ser una versión semántica completa.', entry)
    )
  }

  if (!Array.isArray(value.world.languages) || value.world.languages.length === 0 || value.world.languages.length > 16) {
    return failure(issue('INVALID_MANIFEST', 'world.languages debe declarar entre 1 y 16 idiomas.', entry))
  }

  const languages: string[] = []
  const languageKeys = new Set<string>()
  for (const candidate of value.world.languages) {
    const language = validateLanguageTag(candidate, entry)
    if (!language.success) return language
    const comparisonKey = language.value.toLowerCase()
    if (languageKeys.has(comparisonKey)) {
      return failure(issue('INVALID_MANIFEST', `El idioma "${language.value}" está duplicado.`, entry))
    }
    languageKeys.add(comparisonKey)
    languages.push(language.value)
  }

  if (typeof value.world.defaultLanguage !== 'string' || !languages.includes(value.world.defaultLanguage)) {
    return failure(
      issue('INVALID_MANIFEST', 'world.defaultLanguage debe ser uno de los idiomas declarados.', entry)
    )
  }

  const titles = validateLocalizedText(
    value.world.titles,
    languages,
    'world.titles',
    'INVALID_MANIFEST',
    entry,
    120
  )
  if (!titles.success) return titles

  if (!isRecord(value.compatibility)) {
    return failure(issue('INVALID_MANIFEST', 'compatibility debe ser un mapa.', entry))
  }
  const compatibilityKeys = validateExactKeys(
    value.compatibility,
    ['requiredCapabilities'],
    [],
    'compatibility',
    'INVALID_MANIFEST',
    entry
  )
  if (compatibilityKeys) return failure(compatibilityKeys)
  if (!Array.isArray(value.compatibility.requiredCapabilities)) {
    return failure(
      issue('INVALID_MANIFEST', 'compatibility.requiredCapabilities debe ser una lista.', entry)
    )
  }

  if (value.compatibility.requiredCapabilities.length > 0) {
    return failure(
      issue(
        'UNSUPPORTED_CAPABILITY',
        'El formato v1 no admite todavía capacidades mecánicas: requiredCapabilities debe estar vacío.',
        entry
      )
    )
  }

  if (!isRecord(value.content)) {
    return failure(issue('INVALID_MANIFEST', 'content debe ser un mapa.', entry))
  }
  const contentKeys = validateExactKeys(
    value.content,
    ['descriptions'],
    [],
    'content',
    'INVALID_MANIFEST',
    entry
  )
  if (contentKeys) return failure(contentKeys)
  if (!isRecord(value.content.descriptions)) {
    return failure(issue('INVALID_MANIFEST', 'content.descriptions debe ser un mapa por idioma.', entry))
  }
  if (
    Object.keys(value.content.descriptions).length !== languages.length ||
    Object.keys(value.content.descriptions).some((language) => !languages.includes(language))
  ) {
    return failure(
      issue('INVALID_MANIFEST', 'content.descriptions debe contener exactamente los idiomas declarados.', entry)
    )
  }

  const descriptions: Record<string, string> = Object.create(null) as Record<string, string>
  for (const language of languages) {
    const path = value.content.descriptions[language]
    if (typeof path !== 'string') {
      return failure(issue('INVALID_MANIFEST', `La descripción ${language} debe ser una ruta.`, entry))
    }
    const pathResult = validateFateworldInternalPath(path)
    if (!pathResult.valid || !path.startsWith(`content/${language}/`) || !path.endsWith('.md')) {
      return failure(
        issue(
          'INVALID_MANIFEST',
          `La descripción ${language} debe apuntar a un Markdown bajo content/${language}/.`,
          entry
        )
      )
    }
    descriptions[language] = path
  }

  if (!isRecord(value.data)) {
    return failure(issue('INVALID_MANIFEST', 'data debe ser un mapa.', entry))
  }
  const dataKeys = validateExactKeys(
    value.data,
    ['tables'],
    [],
    'data',
    'INVALID_MANIFEST',
    entry
  )
  if (dataKeys) return failure(dataKeys)
  if (typeof value.data.tables !== 'string') {
    return failure(issue('INVALID_MANIFEST', 'data.tables debe ser una ruta.', entry))
  }
  const tablePath = validateFateworldInternalPath(value.data.tables)
  if (!tablePath.valid || !value.data.tables.startsWith('data/') || !value.data.tables.endsWith('.yaml')) {
    return failure(
      issue('INVALID_MANIFEST', 'data.tables debe apuntar a un YAML bajo data/.', entry)
    )
  }

  if (!isRecord(value.resources)) {
    return failure(issue('INVALID_MANIFEST', 'resources debe ser un mapa.', entry))
  }
  const resourceKeys = validateExactKeys(
    value.resources,
    ['images'],
    [],
    'resources',
    'INVALID_MANIFEST',
    entry
  )
  if (resourceKeys) return failure(resourceKeys)
  if (!Array.isArray(value.resources.images)) {
    return failure(issue('INVALID_MANIFEST', 'resources.images debe ser una lista.', entry))
  }
  if (value.resources.images.length > FATEWORLD_LIMITS.maximumEntries) {
    return failure(
      issue(
        'INVALID_MANIFEST',
        `resources.images no puede superar ${FATEWORLD_LIMITS.maximumEntries} entradas.`,
        entry
      )
    )
  }

  const images: string[] = []
  const imageKeys = new Set<string>()
  for (const candidate of value.resources.images) {
    if (typeof candidate !== 'string') {
      return failure(issue('INVALID_MANIFEST', 'Cada imagen debe declararse mediante una ruta.', entry))
    }
    const pathResult = validateFateworldInternalPath(candidate)
    const lowerPath = candidate.toLowerCase()
    if (
      !pathResult.valid ||
      !candidate.startsWith('assets/images/') ||
      !['.png', '.jpg', '.jpeg', '.webp'].some((extension) => lowerPath.endsWith(extension)) ||
      lowerPath !== candidate
    ) {
      return failure(
        issue(
          'INVALID_MANIFEST',
          'Las imágenes deben usar una extensión admitida y una ruta minúscula bajo assets/images/.',
          entry
        )
      )
    }
    if (imageKeys.has(pathResult.canonicalKey)) {
      return failure(issue('INVALID_MANIFEST', `La imagen "${candidate}" está duplicada.`, entry))
    }
    imageKeys.add(pathResult.canonicalKey)
    images.push(candidate)
  }

  return success({
    formatVersion: FATEWORLD_FORMAT_VERSION,
    world: {
      id: worldId.value,
      version: value.world.version,
      titles: titles.value,
      defaultLanguage: value.world.defaultLanguage,
      languages: Object.freeze(languages)
    },
    compatibility: { requiredCapabilities: Object.freeze([]) },
    content: { descriptions: Object.freeze(descriptions) },
    data: { tables: value.data.tables },
    resources: { images: Object.freeze(images) }
  })
}

function parseTables(value: unknown, manifest: ParsedManifest): ParseResult<readonly FateworldTable[]> {
  const entry = manifest.data.tables
  if (!isRecord(value)) {
    return failure(issue('INVALID_TABLES', 'El archivo de tablas debe ser un mapa YAML.', entry))
  }
  const rootKeys = validateExactKeys(
    value,
    ['tables'],
    [],
    'El documento de tablas',
    'INVALID_TABLES',
    entry
  )
  if (rootKeys) return failure(rootKeys)
  if (
    !Array.isArray(value.tables) ||
    value.tables.length === 0 ||
    value.tables.length > FATEWORLD_LIMITS.maximumTables
  ) {
    return failure(
      issue(
        'INVALID_TABLES',
        `tables debe contener entre 1 y ${FATEWORLD_LIMITS.maximumTables} tablas.`,
        entry
      )
    )
  }

  const tables: FateworldTable[] = []
  const tableIds = new Set<string>()
  let totalEntries = 0
  let totalReferences = 0

  for (const [tableIndex, tableValue] of value.tables.entries()) {
    if (!isRecord(tableValue)) {
      return failure(issue('INVALID_TABLES', `tables[${tableIndex}] debe ser un mapa.`, entry))
    }
    const tableKeys = validateExactKeys(
      tableValue,
      ['id', 'titles', 'entries'],
      [],
      `tables[${tableIndex}]`,
      'INVALID_TABLES',
      entry
    )
    if (tableKeys) return failure(tableKeys)
    const tableId = validateIdentifier(
      tableValue.id,
      `tables[${tableIndex}].id`,
      ELEMENT_ID_PATTERN,
      'INVALID_TABLES',
      entry,
      80
    )
    if (!tableId.success) return tableId
    if (tableIds.has(tableId.value)) {
      return failure(issue('DUPLICATE_ID', `El identificador de tabla "${tableId.value}" está duplicado.`, entry))
    }
    tableIds.add(tableId.value)

    const titles = validateLocalizedText(
      tableValue.titles,
      manifest.world.languages,
      `tables[${tableIndex}].titles`,
      'INVALID_TABLES',
      entry,
      160
    )
    if (!titles.success) return titles
    if (!Array.isArray(tableValue.entries) || tableValue.entries.length === 0) {
      return failure(issue('INVALID_TABLES', `La tabla "${tableId.value}" debe tener entradas.`, entry))
    }

    totalEntries += tableValue.entries.length
    if (totalEntries > FATEWORLD_LIMITS.maximumTableEntries) {
      return failure(
        issue(
          'INVALID_TABLES',
          `El paquete supera el límite de ${FATEWORLD_LIMITS.maximumTableEntries} entradas de tabla.`,
          entry
        )
      )
    }

    const parsedEntries: FateworldTableEntry[] = []
    const entryIds = new Set<string>()
    for (const [entryIndex, entryValue] of tableValue.entries.entries()) {
      if (!isRecord(entryValue)) {
        return failure(
          issue('INVALID_TABLES', `La entrada ${entryIndex} de "${tableId.value}" debe ser un mapa.`, entry)
        )
      }
      const entryKeys = validateExactKeys(
        entryValue,
        ['id', 'texts', 'references'],
        [],
        `La entrada ${entryIndex} de "${tableId.value}"`,
        'INVALID_TABLES',
        entry
      )
      if (entryKeys) return failure(entryKeys)
      const entryId = validateIdentifier(
        entryValue.id,
        `La entrada ${entryIndex} de "${tableId.value}"`,
        ELEMENT_ID_PATTERN,
        'INVALID_TABLES',
        entry,
        80
      )
      if (!entryId.success) return entryId
      if (entryIds.has(entryId.value)) {
        return failure(
          issue(
            'DUPLICATE_ID',
            `El identificador de entrada "${entryId.value}" está duplicado en "${tableId.value}".`,
            entry
          )
        )
      }
      entryIds.add(entryId.value)

      const texts = validateLocalizedText(
        entryValue.texts,
        manifest.world.languages,
        `Los textos de "${tableId.value}.${entryId.value}"`,
        'INVALID_TABLES',
        entry,
        4000
      )
      if (!texts.success) return texts
      if (!Array.isArray(entryValue.references)) {
        return failure(
          issue('INVALID_TABLES', `Las referencias de "${tableId.value}.${entryId.value}" deben ser una lista.`, entry)
        )
      }

      totalReferences += entryValue.references.length
      if (totalReferences > FATEWORLD_LIMITS.maximumReferences) {
        return failure(
          issue(
            'INVALID_TABLES',
            `El paquete supera el límite de ${FATEWORLD_LIMITS.maximumReferences} referencias.`,
            entry
          )
        )
      }

      const references: FateworldTableReference[] = []
      const referenceKeys = new Set<string>()
      for (const [referenceIndex, referenceValue] of entryValue.references.entries()) {
        if (!isRecord(referenceValue)) {
          return failure(
            issue(
              'INVALID_TABLES',
              `La referencia ${referenceIndex} de "${tableId.value}.${entryId.value}" debe ser un mapa.`,
              entry
            )
          )
        }
        const referenceFields = validateExactKeys(
          referenceValue,
          ['tableId'],
          ['entryId'],
          `La referencia ${referenceIndex} de "${tableId.value}.${entryId.value}"`,
          'INVALID_TABLES',
          entry
        )
        if (referenceFields) return failure(referenceFields)
        const referencedTable = validateIdentifier(
          referenceValue.tableId,
          'reference.tableId',
          ELEMENT_ID_PATTERN,
          'INVALID_TABLES',
          entry,
          80
        )
        if (!referencedTable.success) return referencedTable
        let referencedEntry: string | undefined
        if (hasOwn(referenceValue, 'entryId')) {
          const parsedEntryId = validateIdentifier(
            referenceValue.entryId,
            'reference.entryId',
            ELEMENT_ID_PATTERN,
            'INVALID_TABLES',
            entry,
            80
          )
          if (!parsedEntryId.success) return parsedEntryId
          referencedEntry = parsedEntryId.value
        }

        const referenceKey = `${referencedTable.value}\u0000${referencedEntry ?? ''}`
        if (referenceKeys.has(referenceKey)) {
          return failure(
            issue(
              'DUPLICATE_ID',
              `La referencia a "${referencedTable.value}${referencedEntry ? `.${referencedEntry}` : ''}" está duplicada.`,
              entry
            )
          )
        }
        referenceKeys.add(referenceKey)
        references.push(
          referencedEntry === undefined
            ? { tableId: referencedTable.value }
            : { tableId: referencedTable.value, entryId: referencedEntry }
        )
      }

      parsedEntries.push({
        id: entryId.value,
        texts: texts.value,
        references: Object.freeze(references)
      })
    }

    tables.push({
      id: tableId.value,
      titles: titles.value,
      entries: Object.freeze(parsedEntries)
    })
  }

  const entriesByTable = new Map(tables.map((table) => [table.id, new Set(table.entries.map((item) => item.id))]))
  for (const table of tables) {
    for (const tableEntry of table.entries) {
      for (const reference of tableEntry.references) {
        const targetEntries = entriesByTable.get(reference.tableId)
        if (targetEntries === undefined) {
          return failure(
            issue(
              'BROKEN_REFERENCE',
              `"${table.id}.${tableEntry.id}" referencia la tabla inexistente "${reference.tableId}".`,
              entry
            )
          )
        }
        if (reference.entryId !== undefined && !targetEntries.has(reference.entryId)) {
          return failure(
            issue(
              'BROKEN_REFERENCE',
              `"${table.id}.${tableEntry.id}" referencia la entrada inexistente "${reference.tableId}.${reference.entryId}".`,
              entry
            )
          )
        }
      }
    }
  }

  return success(Object.freeze(tables))
}

function validateMarkdown(source: Buffer, entry: string): FateworldValidationError | undefined {
  let text: string
  try {
    text = utf8Decoder.decode(source)
  } catch {
    return issue('INVALID_UTF8', 'El Markdown debe estar codificado como UTF-8 válido.', entry)
  }

  if (text.includes('\u0000') || ACTIVE_HTML.test(text) || REMOTE_MARKDOWN_TARGET.test(text)) {
    return issue(
      'INVALID_MARKDOWN',
      'El Markdown v1 no admite NUL, HTML incrustado ni destinos remotos.',
      entry
    )
  }

  return undefined
}

function validateImage(source: Buffer, entry: string): FateworldValidationError | undefined {
  const lowerEntry = entry.toLowerCase()
  const isPng =
    source.length >= 8 &&
    source.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const isJpeg =
    source.length >= 4 &&
    source[0] === 0xff &&
    source[1] === 0xd8 &&
    source[source.length - 2] === 0xff &&
    source[source.length - 1] === 0xd9
  const isWebp =
    source.length >= 12 &&
    source.subarray(0, 4).toString('ascii') === 'RIFF' &&
    source.subarray(8, 12).toString('ascii') === 'WEBP'

  if (
    (lowerEntry.endsWith('.png') && !isPng) ||
    ((lowerEntry.endsWith('.jpg') || lowerEntry.endsWith('.jpeg')) && !isJpeg) ||
    (lowerEntry.endsWith('.webp') && !isWebp)
  ) {
    return issue('INVALID_IMAGE', 'La firma binaria de la imagen no coincide con su extensión.', entry)
  }

  return undefined
}

export function validateFateworldContract(contents: ValidatedArchiveContents): FateworldValidationResult {
  const manifestSource = contents.files.get('manifest.yaml')
  if (manifestSource === undefined) {
    return {
      valid: false,
      errors: [issue('MISSING_RESOURCE', 'El paquete no contiene manifest.yaml.', 'manifest.yaml')]
    }
  }

  const parsedManifestYaml = parseYaml(manifestSource, 'manifest.yaml')
  if (!parsedManifestYaml.success) return { valid: false, errors: [parsedManifestYaml.error] }
  const manifest = validateManifest(parsedManifestYaml.value)
  if (!manifest.success) return { valid: false, errors: [manifest.error] }

  const declaredFiles = new Set<string>([
    'manifest.yaml',
    manifest.value.data.tables,
    ...Object.values(manifest.value.content.descriptions),
    ...manifest.value.resources.images
  ])

  for (const path of declaredFiles) {
    if (!contents.files.has(path)) {
      return {
        valid: false,
        errors: [issue('MISSING_RESOURCE', `Falta el recurso declarado "${path}".`, path)]
      }
    }
  }

  for (const path of contents.files.keys()) {
    if (!declaredFiles.has(path)) {
      return {
        valid: false,
        errors: [issue('UNDECLARED_RESOURCE', `El archivo "${path}" no está declarado por el manifiesto.`, path)]
      }
    }
  }

  for (const description of Object.values(manifest.value.content.descriptions)) {
    const error = validateMarkdown(contents.files.get(description) as Buffer, description)
    if (error) return { valid: false, errors: [error] }
  }

  for (const image of manifest.value.resources.images) {
    const error = validateImage(contents.files.get(image) as Buffer, image)
    if (error) return { valid: false, errors: [error] }
  }

  const tableSource = contents.files.get(manifest.value.data.tables) as Buffer
  const parsedTableYaml = parseYaml(tableSource, manifest.value.data.tables)
  if (!parsedTableYaml.success) return { valid: false, errors: [parsedTableYaml.error] }
  const tables = parseTables(parsedTableYaml.value, manifest.value)
  if (!tables.success) return { valid: false, errors: [tables.error] }

  return {
    valid: true,
    package: {
      formatVersion: manifest.value.formatVersion,
      world: {
        id: manifest.value.world.id,
        version: manifest.value.world.version,
        titles: manifest.value.world.titles
      },
      languages: manifest.value.world.languages,
      defaultLanguage: manifest.value.world.defaultLanguage,
      compatibility: manifest.value.compatibility,
      content: manifest.value.content,
      data: manifest.value.data,
      resources: manifest.value.resources,
      tables: tables.value,
      archive: {
        fileCount: contents.fileCount,
        uncompressedBytes: contents.uncompressedBytes
      }
    }
  }
}
