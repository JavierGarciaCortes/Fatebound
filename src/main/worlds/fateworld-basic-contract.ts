import { TextDecoder } from 'node:util'
import { parseAllDocuments, visit } from 'yaml'
import { validateBasicMechanics } from './fateworld-basic-mechanics.ts'
import type {
  FateworldValidationError,
  FateworldValidationErrorCode,
  FateworldValidationResult,
  InternalPathValidation,
  ValidatedArchiveContents
} from './fateworld-contract.ts'

export const FATEWORLD_BASIC_ENGINE = 'basic' as const
export const FATEWORLD_BASIC_ENGINE_VERSION = '1.0.0' as const

export interface FateworldDeclarativeObject {
  readonly [key: string]: FateworldDeclarativeValue
}

export interface FateworldDeclarativeList extends ReadonlyArray<FateworldDeclarativeValue> {
  readonly [index: number]: FateworldDeclarativeValue
}

export type FateworldDeclarativeValue =
  | string
  | FateworldDeclarativeList
  | FateworldDeclarativeObject

export type FateworldBasicStep = Readonly<Record<string, FateworldDeclarativeValue>> & {
  readonly op: string
}

export interface FateworldBasicTrigger {
  readonly event: string
  readonly steps: readonly FateworldBasicStep[]
}

export interface FateworldBasicOutcome {
  readonly kind: string
  readonly data: Readonly<Record<string, FateworldDeclarativeValue>>
  readonly steps: readonly FateworldBasicStep[]
  readonly triggers: readonly FateworldBasicTrigger[]
}

export type FateworldBasicSelector =
  | { readonly type: 'd6' }
  | { readonly type: 'yin_yang' }
  | { readonly type: 'value_range'; readonly valueSource: string }
  | {
      readonly type: 'matrix'
      readonly roles: readonly string[]
      readonly actions: readonly string[]
    }

export interface FateworldBasicTableEntry {
  readonly id: string
  readonly when: Readonly<Record<string, FateworldDeclarativeValue>>
  readonly outcome: FateworldBasicOutcome
}

export interface FateworldBasicOptionalEnding {
  readonly id: string
  readonly availability: string
  readonly numericThreshold: string
  readonly confirmationRequired: 'true' | 'false'
  readonly effect: Readonly<Record<string, FateworldDeclarativeValue>>
  readonly note: string
}

export interface FateworldBasicTable {
  readonly id: string
  readonly selector: FateworldBasicSelector
  readonly entries: readonly FateworldBasicTableEntry[]
  readonly optionalEnding?: FateworldBasicOptionalEnding
}

export interface FateworldBasicGameplay {
  readonly characterCreation: {
    readonly nameSelection: {
      readonly mode: 'choice'
      readonly options: readonly {
        readonly id: string
        readonly tableId: string
        readonly labelKey: string
      }[]
    }
  }
  readonly tableBindings: Readonly<Record<string, Readonly<Record<string, string>>>>
}

export interface FateworldBasicPackageInfo {
  readonly profile: 'basic'
  readonly mechanicalValidation: 'strict-static'
  readonly formatVersion: '1'
  readonly world: {
    readonly id: string
    readonly version: string
    readonly titles: Readonly<Record<string, string>>
  }
  readonly languages: readonly string[]
  readonly defaultLanguage: string
  readonly compatibility: {
    readonly engine: typeof FATEWORLD_BASIC_ENGINE
    readonly engineVersion: typeof FATEWORLD_BASIC_ENGINE_VERSION
    readonly requiredCapabilities: readonly string[]
  }
  readonly content: {
    readonly descriptions: Readonly<Record<string, string>>
  }
  readonly data: {
    readonly gameplay: string
    readonly tables: readonly string[]
  }
  readonly localization: {
    readonly catalogs: Readonly<Record<string, readonly string[]>>
  }
  readonly resources: {
    readonly images: readonly string[]
    readonly presentation: {
      readonly hero: string
      readonly card: string
      readonly emblem: string
    }
  }
  readonly gameplay: FateworldBasicGameplay
  readonly tables: readonly FateworldBasicTable[]
  readonly archive: {
    readonly fileCount: number
    readonly uncompressedBytes: number
  }
}

interface BasicContractLimits {
  readonly maximumEntries: number
  readonly maximumTables: number
  readonly maximumTableEntries: number
  readonly maximumDeclarativeDepth: number
  readonly maximumDeclarativeNodes: number
  readonly maximumDeclarativeTextLength: number
}

interface BasicContractDependencies {
  readonly limits: BasicContractLimits
  readonly validateInternalPath: (path: string) => InternalPathValidation
}

interface ParsedBasicManifest {
  readonly formatVersion: '1'
  readonly world: {
    readonly id: string
    readonly version: string
    readonly titles: Readonly<Record<string, string>>
    readonly defaultLanguage: string
    readonly languages: readonly string[]
  }
  readonly compatibility: FateworldBasicPackageInfo['compatibility']
  readonly content: FateworldBasicPackageInfo['content']
  readonly data: FateworldBasicPackageInfo['data']
  readonly localization: FateworldBasicPackageInfo['localization']
  readonly resources: FateworldBasicPackageInfo['resources']
}

type ParseResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: FateworldValidationError }

interface DeclarativeBudget {
  nodes: number
}

interface ParsedLocalizations {
  readonly generalKeysByLanguage: ReadonlyMap<string, ReadonlySet<string>>
  readonly tableEntryKeysByLanguage: ReadonlyMap<
    string,
    ReadonlyMap<string, ReadonlyMap<string, ReadonlySet<string>>>
  >
}

const WORLD_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/
const ELEMENT_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/
const PROPERTY_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/
const LOCALIZATION_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)+$/
const INTEGER_STRING_PATTERN = /^-?(?:0|[1-9]\d*)$/
const SEMANTIC_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const LANGUAGE_TAG_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/
const REMOTE_MARKDOWN_TARGET =
  /(?:\]\(\s*|^\s*\[[^\]]+\]:\s*)(?:[a-z][a-z0-9+.-]*:|\/\/)/im
const ACTIVE_HTML = /<\/?[A-Za-z][^>]*>/
const FORBIDDEN_DATA_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) <= 0x1f) return true
  }
  return false
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

function validateText(
  value: unknown,
  label: string,
  code: FateworldValidationErrorCode,
  entry: string,
  maximumLength: number
): ParseResult<string> {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > maximumLength ||
    value.includes('\u0000')
  ) {
    return failure(
      issue(code, `${label} debe ser texto no vacío de hasta ${maximumLength} caracteres.`, entry)
    )
  }
  return success(value)
}

function validateIdentifier(
  value: unknown,
  label: string,
  code: FateworldValidationErrorCode,
  entry: string,
  maximumLength = 100,
  pattern = ELEMENT_ID_PATTERN
): ParseResult<string> {
  const text = validateText(value, label, code, entry, maximumLength)
  if (!text.success) return text
  if (!pattern.test(text.value)) {
    return failure(issue(code, `${label} no usa un identificador estable admitido.`, entry))
  }
  return text
}

function isSemanticVersion(value: string): boolean {
  if (!SEMANTIC_VERSION_PATTERN.test(value)) return false
  const buildSeparator = value.indexOf('+')
  const withoutBuild = buildSeparator === -1 ? value : value.slice(0, buildSeparator)
  const prereleaseSeparator = withoutBuild.indexOf('-')
  if (prereleaseSeparator === -1) return true
  return withoutBuild
    .slice(prereleaseSeparator + 1)
    .split('.')
    .every((identifier) => !/^\d+$/.test(identifier) || identifier === '0' || !identifier.startsWith('0'))
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
      return failure(issue('INVALID_YAML', 'El YAML no puede usar alias, anclas ni etiquetas explícitas.', entry))
    }

    return success(document.toJS({ maxAliasCount: 0 }) as unknown)
  } catch {
    return failure(issue('INVALID_YAML', 'No se pudo analizar el YAML seguro del paquete.', entry))
  }
}

function validateLocalizedText(
  value: unknown,
  languages: readonly string[],
  label: string,
  entry: string,
  maximumLength: number
): ParseResult<Readonly<Record<string, string>>> {
  if (!isRecord(value)) {
    return failure(issue('INVALID_MANIFEST', `${label} debe ser un mapa por idioma.`, entry))
  }
  const keys = Object.keys(value)
  if (keys.length !== languages.length || keys.some((key) => !languages.includes(key))) {
    return failure(issue('INVALID_MANIFEST', `${label} debe contener exactamente los idiomas declarados.`, entry))
  }

  const result: Record<string, string> = Object.create(null) as Record<string, string>
  for (const language of languages) {
    const text = validateText(value[language], `${label}.${language}`, 'INVALID_MANIFEST', entry, maximumLength)
    if (!text.success) return text
    result[language] = text.value
  }
  return success(Object.freeze(result))
}

function validateLanguage(value: unknown, entry: string): ParseResult<string> {
  if (typeof value !== 'string' || value.length > 35 || !LANGUAGE_TAG_PATTERN.test(value)) {
    return failure(issue('INVALID_MANIFEST', 'El manifiesto contiene una etiqueta de idioma no válida.', entry))
  }
  try {
    const [canonical] = Intl.getCanonicalLocales(value)
    if (canonical !== value) {
      return failure(issue('INVALID_MANIFEST', `El idioma "${value}" debe usar su forma canónica "${canonical}".`, entry))
    }
  } catch {
    return failure(issue('INVALID_MANIFEST', `El idioma "${value}" no es una etiqueta BCP 47 válida.`, entry))
  }
  return success(value)
}

function parsePathList(
  value: unknown,
  label: string,
  entry: string,
  maximumEntries: number,
  isAllowed: (path: string) => boolean,
  dependencies: BasicContractDependencies,
  requireLowercase = true
): ParseResult<readonly string[]> {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximumEntries) {
    return failure(issue('INVALID_MANIFEST', `${label} debe ser una lista no vacía dentro de los límites del formato.`, entry))
  }

  const paths: string[] = []
  const keys = new Set<string>()
  for (const candidate of value) {
    if (typeof candidate !== 'string') {
      return failure(issue('INVALID_MANIFEST', `${label} solo puede contener rutas.`, entry))
    }
    const path = dependencies.validateInternalPath(candidate)
    if (
      !path.valid ||
      (requireLowercase && candidate !== candidate.toLowerCase()) ||
      !isAllowed(candidate)
    ) {
      return failure(issue('INVALID_MANIFEST', `${label} contiene una ruta no admitida: "${candidate}".`, entry))
    }
    if (keys.has(path.canonicalKey)) {
      return failure(issue('INVALID_MANIFEST', `${label} contiene la ruta duplicada "${candidate}".`, entry))
    }
    keys.add(path.canonicalKey)
    paths.push(candidate)
  }
  return success(Object.freeze(paths))
}

function parseManifest(
  value: unknown,
  dependencies: BasicContractDependencies
): ParseResult<ParsedBasicManifest> {
  const entry = 'manifest.yaml'
  if (!isRecord(value)) {
    return failure(issue('INVALID_MANIFEST', 'El manifiesto debe ser un mapa YAML.', entry))
  }
  if (value.formatVersion !== '1') {
    return failure(issue('UNSUPPORTED_FORMAT_VERSION', 'Fatebound solo admite formatVersion "1".', entry))
  }
  if (
    isRecord(value.compatibility) &&
    hasOwn(value.compatibility, 'engine') &&
    hasOwn(value.compatibility, 'engineVersion') &&
    (value.compatibility.engine !== FATEWORLD_BASIC_ENGINE ||
      value.compatibility.engineVersion !== FATEWORLD_BASIC_ENGINE_VERSION)
  ) {
    return failure(
      issue(
        'UNSUPPORTED_ENGINE',
        `Fatebound solo admite el motor ${FATEWORLD_BASIC_ENGINE} ${FATEWORLD_BASIC_ENGINE_VERSION} en este perfil.`,
        entry
      )
    )
  }
  const rootKeys = validateExactKeys(
    value,
    ['formatVersion', 'world', 'compatibility', 'content', 'data', 'localization', 'resources'],
    [],
    'El manifiesto Basic',
    'INVALID_MANIFEST',
    entry
  )
  if (rootKeys) return failure(rootKeys)
  if (!isRecord(value.world)) return failure(issue('INVALID_MANIFEST', 'world debe ser un mapa.', entry))
  const worldKeys = validateExactKeys(
    value.world,
    ['id', 'version', 'titles', 'defaultLanguage', 'languages'],
    [],
    'world',
    'INVALID_MANIFEST',
    entry
  )
  if (worldKeys) return failure(worldKeys)
  const worldId = validateIdentifier(value.world.id, 'world.id', 'INVALID_MANIFEST', entry, 100, WORLD_ID_PATTERN)
  if (!worldId.success) return worldId
  if (
    typeof value.world.version !== 'string' ||
    value.world.version.length > 100 ||
    !isSemanticVersion(value.world.version)
  ) {
    return failure(issue('INVALID_MANIFEST', 'world.version debe ser una versión semántica completa.', entry))
  }
  if (!Array.isArray(value.world.languages) || value.world.languages.length === 0 || value.world.languages.length > 16) {
    return failure(issue('INVALID_MANIFEST', 'world.languages debe declarar entre 1 y 16 idiomas.', entry))
  }

  const languages: string[] = []
  const languageKeys = new Set<string>()
  for (const candidate of value.world.languages) {
    const language = validateLanguage(candidate, entry)
    if (!language.success) return language
    const key = language.value.toLowerCase()
    if (languageKeys.has(key)) {
      return failure(issue('INVALID_MANIFEST', `El idioma "${language.value}" está duplicado.`, entry))
    }
    languageKeys.add(key)
    languages.push(language.value)
  }
  if (typeof value.world.defaultLanguage !== 'string' || !languages.includes(value.world.defaultLanguage)) {
    return failure(issue('INVALID_MANIFEST', 'world.defaultLanguage debe ser uno de los idiomas declarados.', entry))
  }
  const titles = validateLocalizedText(value.world.titles, languages, 'world.titles', entry, 120)
  if (!titles.success) return titles

  if (!isRecord(value.compatibility)) {
    return failure(issue('INVALID_MANIFEST', 'compatibility debe ser un mapa.', entry))
  }
  const compatibilityKeys = validateExactKeys(
    value.compatibility,
    ['engine', 'engineVersion', 'requiredCapabilities'],
    [],
    'compatibility Basic',
    'INVALID_MANIFEST',
    entry
  )
  if (compatibilityKeys) return failure(compatibilityKeys)
  if (
    value.compatibility.engine !== FATEWORLD_BASIC_ENGINE ||
    value.compatibility.engineVersion !== FATEWORLD_BASIC_ENGINE_VERSION
  ) {
    return failure(
      issue(
        'UNSUPPORTED_ENGINE',
        `Fatebound solo admite el motor ${FATEWORLD_BASIC_ENGINE} ${FATEWORLD_BASIC_ENGINE_VERSION} en este perfil.`,
        entry
      )
    )
  }
  if (!Array.isArray(value.compatibility.requiredCapabilities)) {
    return failure(issue('INVALID_MANIFEST', 'compatibility.requiredCapabilities debe ser una lista.', entry))
  }
  if (value.compatibility.requiredCapabilities.length > 0) {
    return failure(issue('UNSUPPORTED_CAPABILITY', 'Basic 1.0.0 no admite capacidades adicionales.', entry))
  }

  if (!isRecord(value.content)) return failure(issue('INVALID_MANIFEST', 'content debe ser un mapa.', entry))
  const contentKeys = validateExactKeys(value.content, ['descriptions'], [], 'content', 'INVALID_MANIFEST', entry)
  if (contentKeys) return failure(contentKeys)
  if (!isRecord(value.content.descriptions)) {
    return failure(issue('INVALID_MANIFEST', 'content.descriptions debe ser un mapa por idioma.', entry))
  }
  if (
    Object.keys(value.content.descriptions).length !== languages.length ||
    Object.keys(value.content.descriptions).some((language) => !languages.includes(language))
  ) {
    return failure(issue('INVALID_MANIFEST', 'content.descriptions debe contener exactamente los idiomas declarados.', entry))
  }
  const descriptions: Record<string, string> = Object.create(null) as Record<string, string>
  for (const language of languages) {
    const candidate = value.content.descriptions[language]
    if (typeof candidate !== 'string') {
      return failure(issue('INVALID_MANIFEST', `La descripción ${language} debe ser una ruta.`, entry))
    }
    const path = dependencies.validateInternalPath(candidate)
    if (!path.valid || !candidate.startsWith(`content/${language}/`) || !candidate.endsWith('.md')) {
      return failure(issue('INVALID_MANIFEST', `La descripción ${language} debe ser un Markdown bajo content/${language}/.`, entry))
    }
    descriptions[language] = candidate
  }

  if (!isRecord(value.data)) return failure(issue('INVALID_MANIFEST', 'data debe ser un mapa.', entry))
  const dataKeys = validateExactKeys(value.data, ['gameplay', 'tables'], [], 'data', 'INVALID_MANIFEST', entry)
  if (dataKeys) return failure(dataKeys)
  if (typeof value.data.gameplay !== 'string') {
    return failure(issue('INVALID_MANIFEST', 'data.gameplay debe ser una ruta.', entry))
  }
  const gameplayPath = dependencies.validateInternalPath(value.data.gameplay)
  if (
    !gameplayPath.valid ||
    value.data.gameplay !== value.data.gameplay.toLowerCase() ||
    !value.data.gameplay.startsWith('data/') ||
    value.data.gameplay.startsWith('data/tables/') ||
    !value.data.gameplay.endsWith('.yaml')
  ) {
    return failure(issue('INVALID_MANIFEST', 'data.gameplay debe apuntar a un YAML bajo data/.', entry))
  }
  const tables = parsePathList(
    value.data.tables,
    'data.tables',
    entry,
    dependencies.limits.maximumTables,
    (path) => path.startsWith('data/tables/') && path.endsWith('.yaml'),
    dependencies
  )
  if (!tables.success) return tables
  if (tables.value.includes(value.data.gameplay)) {
    return failure(issue('INVALID_MANIFEST', 'data.gameplay no puede reutilizar un archivo declarado como tabla.', entry))
  }

  if (!isRecord(value.localization)) {
    return failure(issue('INVALID_MANIFEST', 'localization debe ser un mapa.', entry))
  }
  const localizationKeys = validateExactKeys(value.localization, ['catalogs'], [], 'localization', 'INVALID_MANIFEST', entry)
  if (localizationKeys) return failure(localizationKeys)
  if (!isRecord(value.localization.catalogs)) {
    return failure(issue('INVALID_MANIFEST', 'localization.catalogs debe ser un mapa por idioma.', entry))
  }
  const catalogLanguages = Object.keys(value.localization.catalogs)
  if (catalogLanguages.length !== languages.length || catalogLanguages.some((language) => !languages.includes(language))) {
    return failure(issue('INVALID_MANIFEST', 'localization.catalogs debe contener exactamente los idiomas declarados.', entry))
  }
  const catalogs: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>
  const allCatalogPaths = new Set<string>()
  for (const language of languages) {
    const parsed = parsePathList(
      value.localization.catalogs[language],
      `localization.catalogs.${language}`,
      entry,
      dependencies.limits.maximumEntries,
      (path) => path.startsWith(`locales/${language}/`) && path.endsWith('.yaml'),
      dependencies,
      false
    )
    if (!parsed.success) return parsed
    for (const path of parsed.value) {
      if (allCatalogPaths.has(path)) {
        return failure(issue('INVALID_MANIFEST', `El catálogo "${path}" está declarado más de una vez.`, entry))
      }
      allCatalogPaths.add(path)
    }
    catalogs[language] = parsed.value
  }

  if (!isRecord(value.resources)) return failure(issue('INVALID_MANIFEST', 'resources debe ser un mapa.', entry))
  const resourceKeys = validateExactKeys(
    value.resources,
    ['images', 'presentation'],
    [],
    'resources',
    'INVALID_MANIFEST',
    entry
  )
  if (resourceKeys) return failure(resourceKeys)
  const images = parsePathList(
    value.resources.images,
    'resources.images',
    entry,
    dependencies.limits.maximumEntries,
    (path) =>
      path.startsWith('assets/images/') &&
      ['.png', '.jpg', '.jpeg', '.webp'].some((extension) => path.endsWith(extension)),
    dependencies
  )
  if (!images.success) return images
  if (!isRecord(value.resources.presentation)) {
    return failure(issue('INVALID_MANIFEST', 'resources.presentation debe ser un mapa.', entry))
  }
  const presentationKeys = validateExactKeys(
    value.resources.presentation,
    ['hero', 'card', 'emblem'],
    [],
    'resources.presentation',
    'INVALID_MANIFEST',
    entry
  )
  if (presentationKeys) return failure(presentationKeys)
  const presentationValues: Record<'hero' | 'card' | 'emblem', string> = {
    hero: '',
    card: '',
    emblem: ''
  }
  for (const role of ['hero', 'card', 'emblem'] as const) {
    const path = value.resources.presentation[role]
    if (typeof path !== 'string' || !images.value.includes(path)) {
      return failure(issue('BROKEN_REFERENCE', `resources.presentation.${role} debe referenciar una imagen declarada.`, entry))
    }
    presentationValues[role] = path
  }

  const declaredPaths = [
    ...Object.values(descriptions),
    value.data.gameplay,
    ...tables.value,
    ...allCatalogPaths,
    ...images.value
  ]
  if (new Set(declaredPaths).size !== declaredPaths.length) {
    return failure(issue('INVALID_MANIFEST', 'Un archivo no puede cumplir más de un rol en el manifiesto.', entry))
  }

  return success({
    formatVersion: '1',
    world: {
      id: worldId.value,
      version: value.world.version,
      titles: titles.value,
      defaultLanguage: value.world.defaultLanguage,
      languages: Object.freeze(languages)
    },
    compatibility: {
      engine: FATEWORLD_BASIC_ENGINE,
      engineVersion: FATEWORLD_BASIC_ENGINE_VERSION,
      requiredCapabilities: Object.freeze([])
    },
    content: { descriptions: Object.freeze(descriptions) },
    data: { gameplay: value.data.gameplay, tables: tables.value },
    localization: { catalogs: Object.freeze(catalogs) },
    resources: {
      images: images.value,
      presentation: Object.freeze(presentationValues)
    }
  })
}

function parseFaceList(
  value: unknown,
  label: string,
  entry: string
): ParseResult<readonly FateworldDeclarativeValue[]> {
  if (!Array.isArray(value) || value.length === 0 || value.length > 6) {
    return failure(issue('INVALID_TABLES', `${label} debe ser una lista no vacía de caras d6.`, entry))
  }
  const faces: string[] = []
  for (const face of value) {
    if (typeof face !== 'string' || !['1', '2', '3', '4', '5', '6'].includes(face) || faces.includes(face)) {
      return failure(issue('INVALID_TABLES', `${label} contiene una cara d6 inválida o duplicada.`, entry))
    }
    faces.push(face)
  }
  return success(Object.freeze(faces))
}

function parseIdentifierList(
  value: unknown,
  label: string,
  entry: string
): ParseResult<readonly string[]> {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    return failure(issue('INVALID_TABLES', `${label} debe ser una lista no vacía.`, entry))
  }
  const result: string[] = []
  for (const candidate of value) {
    const identifier = validateIdentifier(candidate, label, 'INVALID_TABLES', entry, 80)
    if (!identifier.success) return identifier
    if (result.includes(identifier.value)) {
      return failure(issue('DUPLICATE_ID', `${label} contiene el identificador duplicado "${identifier.value}".`, entry))
    }
    result.push(identifier.value)
  }
  return success(Object.freeze(result))
}

function parseSelector(value: unknown, entry: string): ParseResult<FateworldBasicSelector> {
  if (!isRecord(value)) return failure(issue('INVALID_TABLES', 'selector debe ser un mapa.', entry))
  if (value.type === 'd6' || value.type === 'yin_yang') {
    const keys = validateExactKeys(value, ['type'], [], 'selector', 'INVALID_TABLES', entry)
    if (keys) return failure(keys)
    return success({ type: value.type })
  }
  if (value.type === 'value_range') {
    const keys = validateExactKeys(value, ['type', 'valueSource'], [], 'selector', 'INVALID_TABLES', entry)
    if (keys) return failure(keys)
    const source = validateIdentifier(value.valueSource, 'selector.valueSource', 'INVALID_TABLES', entry, 120)
    if (!source.success) return source
    return success({ type: 'value_range', valueSource: source.value })
  }
  if (value.type === 'matrix') {
    const keys = validateExactKeys(value, ['type', 'roles', 'actions'], [], 'selector', 'INVALID_TABLES', entry)
    if (keys) return failure(keys)
    const roles = parseIdentifierList(value.roles, 'selector.roles', entry)
    if (!roles.success) return roles
    const actions = parseIdentifierList(value.actions, 'selector.actions', entry)
    if (!actions.success) return actions
    return success({ type: 'matrix', roles: roles.value, actions: actions.value })
  }
  return failure(issue('INVALID_TABLES', 'La tabla usa un selector Basic no admitido.', entry))
}

function parseWhen(
  value: unknown,
  selector: FateworldBasicSelector,
  entry: string
): ParseResult<Readonly<Record<string, FateworldDeclarativeValue>>> {
  if (!isRecord(value)) return failure(issue('INVALID_TABLES', 'entry.when debe ser un mapa.', entry))
  if (selector.type === 'd6') {
    const keys = validateExactKeys(value, ['faces'], [], 'entry.when', 'INVALID_TABLES', entry)
    if (keys) return failure(keys)
    const faces = parseFaceList(value.faces, 'entry.when.faces', entry)
    if (!faces.success) return faces
    return success(Object.freeze({ faces: faces.value }))
  }
  if (selector.type === 'yin_yang') {
    const keys = validateExactKeys(value, ['yin', 'yang'], [], 'entry.when', 'INVALID_TABLES', entry)
    if (keys) return failure(keys)
    const yin = parseFaceList(value.yin, 'entry.when.yin', entry)
    if (!yin.success) return yin
    const yang = parseFaceList(value.yang, 'entry.when.yang', entry)
    if (!yang.success) return yang
    return success(Object.freeze({ yin: yin.value, yang: yang.value }))
  }
  if (selector.type === 'value_range') {
    const keys = validateExactKeys(value, ['range'], [], 'entry.when', 'INVALID_TABLES', entry)
    if (keys) return failure(keys)
    if (!isRecord(value.range)) {
      return failure(issue('INVALID_TABLES', 'entry.when.range debe ser un mapa.', entry))
    }
    const rangeKeys = validateExactKeys(value.range, ['min'], ['max'], 'entry.when.range', 'INVALID_TABLES', entry)
    if (rangeKeys) return failure(rangeKeys)
    if (typeof value.range.min !== 'string' || !INTEGER_STRING_PATTERN.test(value.range.min)) {
      return failure(issue('INVALID_TABLES', 'entry.when.range.min debe ser una cadena entera.', entry))
    }
    const range: Record<string, FateworldDeclarativeValue> = { min: value.range.min }
    if (hasOwn(value.range, 'max')) {
      if (typeof value.range.max !== 'string' || !INTEGER_STRING_PATTERN.test(value.range.max)) {
        return failure(issue('INVALID_TABLES', 'entry.when.range.max debe ser una cadena entera.', entry))
      }
      range.max = value.range.max
    }
    return success(Object.freeze({ range: Object.freeze(range) }))
  }

  const keys = validateExactKeys(value, ['npcRole', 'action'], [], 'entry.when', 'INVALID_TABLES', entry)
  if (keys) return failure(keys)
  if (
    typeof value.npcRole !== 'string' ||
    !selector.roles.includes(value.npcRole) ||
    typeof value.action !== 'string' ||
    !selector.actions.includes(value.action)
  ) {
    return failure(issue('BROKEN_REFERENCE', 'La condición matrix debe usar un rol y una acción declarados.', entry))
  }
  return success(Object.freeze({ npcRole: value.npcRole, action: value.action }))
}

function parseDeclarativeValue(
  value: unknown,
  label: string,
  entry: string,
  dependencies: BasicContractDependencies,
  budget: DeclarativeBudget,
  depth = 0
): ParseResult<FateworldDeclarativeValue> {
  budget.nodes += 1
  if (budget.nodes > dependencies.limits.maximumDeclarativeNodes) {
    return failure(issue('INVALID_TABLES', `${label} supera el límite de nodos declarativos.`, entry))
  }
  if (depth > dependencies.limits.maximumDeclarativeDepth) {
    return failure(issue('INVALID_TABLES', `${label} supera la profundidad declarativa admitida.`, entry))
  }
  if (typeof value === 'string') {
    if (value.length > dependencies.limits.maximumDeclarativeTextLength || value.includes('\u0000')) {
      return failure(issue('INVALID_TABLES', `${label} contiene un escalar no admitido.`, entry))
    }
    return success(value)
  }
  if (Array.isArray(value)) {
    const items: FateworldDeclarativeValue[] = []
    for (const [index, item] of value.entries()) {
      const parsed = parseDeclarativeValue(item, `${label}[${index}]`, entry, dependencies, budget, depth + 1)
      if (!parsed.success) return parsed
      items.push(parsed.value)
    }
    return success(Object.freeze(items))
  }
  if (isRecord(value)) {
    const result: Record<string, FateworldDeclarativeValue> = Object.create(null) as Record<string, FateworldDeclarativeValue>
    for (const [key, item] of Object.entries(value)) {
      if (
        key.length === 0 ||
        key.length > 120 ||
        containsControlCharacter(key) ||
        FORBIDDEN_DATA_KEYS.has(key)
      ) {
        return failure(issue('INVALID_TABLES', `${label} contiene una clave declarativa no admitida.`, entry))
      }
      const parsed = parseDeclarativeValue(item, `${label}.${key}`, entry, dependencies, budget, depth + 1)
      if (!parsed.success) return parsed
      result[key] = parsed.value
    }
    return success(Object.freeze(result))
  }
  return failure(issue('INVALID_TABLES', `${label} solo admite texto, listas y mapas.`, entry))
}

function parseSteps(
  value: unknown,
  label: string,
  entry: string,
  dependencies: BasicContractDependencies,
  budget: DeclarativeBudget
): ParseResult<readonly FateworldBasicStep[]> {
  if (!Array.isArray(value)) {
    return failure(issue('INVALID_TABLES', `${label} debe ser una lista.`, entry))
  }
  const steps: FateworldBasicStep[] = []
  for (const [index, candidate] of value.entries()) {
    if (!isRecord(candidate)) {
      return failure(issue('INVALID_TABLES', `${label}[${index}] debe ser un mapa.`, entry))
    }
    const operation = validateIdentifier(candidate.op, `${label}[${index}].op`, 'INVALID_TABLES', entry, 120)
    if (!operation.success) return operation
    const parsed = parseDeclarativeValue(candidate, `${label}[${index}]`, entry, dependencies, budget)
    if (!parsed.success) return failure(parsed.error)
    if (typeof parsed.value === 'string' || Array.isArray(parsed.value)) {
      return failure(issue('INVALID_TABLES', `${label}[${index}] debe ser un mapa.`, entry))
    }
    steps.push(parsed.value as FateworldBasicStep)
  }
  return success(Object.freeze(steps))
}

function parseOutcome(
  value: unknown,
  entry: string,
  dependencies: BasicContractDependencies
): ParseResult<FateworldBasicOutcome> {
  if (!isRecord(value)) return failure(issue('INVALID_TABLES', 'entry.outcome debe ser un mapa.', entry))
  const keys = validateExactKeys(
    value,
    ['kind', 'data', 'steps', 'triggers'],
    [],
    'entry.outcome',
    'INVALID_TABLES',
    entry
  )
  if (keys) return failure(keys)
  const kind = validateIdentifier(value.kind, 'entry.outcome.kind', 'INVALID_TABLES', entry, 120)
  if (!kind.success) return kind
  if (!isRecord(value.data)) return failure(issue('INVALID_TABLES', 'entry.outcome.data debe ser un mapa.', entry))
  const budget: DeclarativeBudget = { nodes: 0 }
  const data = parseDeclarativeValue(value.data, 'entry.outcome.data', entry, dependencies, budget)
  if (!data.success) return failure(data.error)
  if (typeof data.value === 'string' || Array.isArray(data.value)) {
    return failure(issue('INVALID_TABLES', 'entry.outcome.data debe ser un mapa.', entry))
  }
  const steps = parseSteps(value.steps, 'entry.outcome.steps', entry, dependencies, budget)
  if (!steps.success) return steps
  if (!Array.isArray(value.triggers)) {
    return failure(issue('INVALID_TABLES', 'entry.outcome.triggers debe ser una lista.', entry))
  }
  const triggers: FateworldBasicTrigger[] = []
  for (const [index, candidate] of value.triggers.entries()) {
    if (!isRecord(candidate)) {
      return failure(issue('INVALID_TABLES', `entry.outcome.triggers[${index}] debe ser un mapa.`, entry))
    }
    const triggerKeys = validateExactKeys(
      candidate,
      ['event', 'steps'],
      [],
      `entry.outcome.triggers[${index}]`,
      'INVALID_TABLES',
      entry
    )
    if (triggerKeys) return failure(triggerKeys)
    const event = validateIdentifier(candidate.event, 'trigger.event', 'INVALID_TABLES', entry, 120)
    if (!event.success) return event
    const triggerSteps = parseSteps(
      candidate.steps,
      `entry.outcome.triggers[${index}].steps`,
      entry,
      dependencies,
      budget
    )
    if (!triggerSteps.success) return triggerSteps
    triggers.push({ event: event.value, steps: triggerSteps.value })
  }
  return success({
    kind: kind.value,
    data: data.value as Readonly<Record<string, FateworldDeclarativeValue>>,
    steps: steps.value,
    triggers: Object.freeze(triggers)
  })
}

function parseOptionalEnding(
  value: unknown,
  entry: string,
  dependencies: BasicContractDependencies
): ParseResult<FateworldBasicOptionalEnding> {
  if (!isRecord(value)) return failure(issue('INVALID_TABLES', 'optionalEnding debe ser un mapa.', entry))
  const keys = validateExactKeys(
    value,
    ['id', 'availability', 'numericThreshold', 'confirmationRequired', 'effect', 'note'],
    [],
    'optionalEnding',
    'INVALID_TABLES',
    entry
  )
  if (keys) return failure(keys)
  const id = validateIdentifier(value.id, 'optionalEnding.id', 'INVALID_TABLES', entry, 80)
  if (!id.success) return id
  const availability = validateIdentifier(value.availability, 'optionalEnding.availability', 'INVALID_TABLES', entry, 120)
  if (!availability.success) return availability
  const threshold = validateIdentifier(value.numericThreshold, 'optionalEnding.numericThreshold', 'INVALID_TABLES', entry, 120)
  if (!threshold.success) return threshold
  if (value.confirmationRequired !== 'true' && value.confirmationRequired !== 'false') {
    return failure(issue('INVALID_TABLES', 'optionalEnding.confirmationRequired debe ser "true" o "false".', entry))
  }
  if (!isRecord(value.effect) || typeof value.effect.type !== 'string') {
    return failure(issue('INVALID_TABLES', 'optionalEnding.effect debe ser un mapa declarativo con type.', entry))
  }
  const effectType = validateIdentifier(
    value.effect.type,
    'optionalEnding.effect.type',
    'INVALID_TABLES',
    entry,
    120
  )
  if (!effectType.success) return effectType
  const effectBudget: DeclarativeBudget = { nodes: 0 }
  const effect = parseDeclarativeValue(value.effect, 'optionalEnding.effect', entry, dependencies, effectBudget)
  if (!effect.success) return failure(effect.error)
  if (typeof effect.value === 'string' || Array.isArray(effect.value)) {
    return failure(issue('INVALID_TABLES', 'optionalEnding.effect debe ser un mapa.', entry))
  }
  const note = validateText(
    value.note,
    'optionalEnding.note',
    'INVALID_TABLES',
    entry,
    dependencies.limits.maximumDeclarativeTextLength
  )
  if (!note.success) return note
  return success({
    id: id.value,
    availability: availability.value,
    numericThreshold: threshold.value,
    confirmationRequired: value.confirmationRequired,
    effect: effect.value as Readonly<Record<string, FateworldDeclarativeValue>>,
    note: note.value
  })
}

function parseTable(
  value: unknown,
  entry: string,
  dependencies: BasicContractDependencies
): ParseResult<FateworldBasicTable> {
  if (!isRecord(value)) return failure(issue('INVALID_TABLES', 'Cada archivo de tabla debe ser un mapa.', entry))
  const keys = validateExactKeys(value, ['id', 'selector', 'entries'], ['optionalEnding'], 'La tabla', 'INVALID_TABLES', entry)
  if (keys) return failure(keys)
  const id = validateIdentifier(value.id, 'table.id', 'INVALID_TABLES', entry, 80)
  if (!id.success) return id
  const selector = parseSelector(value.selector, entry)
  if (!selector.success) return selector
  if (!Array.isArray(value.entries) || value.entries.length === 0) {
    return failure(issue('INVALID_TABLES', `La tabla "${id.value}" debe contener entradas.`, entry))
  }

  const entries: FateworldBasicTableEntry[] = []
  const entryIds = new Set<string>()
  for (const [index, candidate] of value.entries.entries()) {
    if (!isRecord(candidate)) {
      return failure(issue('INVALID_TABLES', `entries[${index}] debe ser un mapa.`, entry))
    }
    const entryKeys = validateExactKeys(candidate, ['id', 'when', 'outcome'], [], `entries[${index}]`, 'INVALID_TABLES', entry)
    if (entryKeys) return failure(entryKeys)
    const entryId = validateIdentifier(candidate.id, `entries[${index}].id`, 'INVALID_TABLES', entry, 80)
    if (!entryId.success) return entryId
    if (entryIds.has(entryId.value)) {
      return failure(issue('DUPLICATE_ID', `La entrada "${entryId.value}" está duplicada en "${id.value}".`, entry))
    }
    entryIds.add(entryId.value)
    const when = parseWhen(candidate.when, selector.value, entry)
    if (!when.success) return when
    const outcome = parseOutcome(candidate.outcome, entry, dependencies)
    if (!outcome.success) return outcome
    entries.push({ id: entryId.value, when: when.value, outcome: outcome.value })
  }

  let optionalEnding: FateworldBasicOptionalEnding | undefined
  if (hasOwn(value, 'optionalEnding')) {
    const parsed = parseOptionalEnding(value.optionalEnding, entry, dependencies)
    if (!parsed.success) return parsed
    optionalEnding = parsed.value
  }
  return success({
    id: id.value,
    selector: selector.value,
    entries: Object.freeze(entries),
    ...(optionalEnding === undefined ? {} : { optionalEnding })
  })
}

function parseTables(
  contents: ValidatedArchiveContents,
  manifest: ParsedBasicManifest,
  dependencies: BasicContractDependencies
): ParseResult<readonly FateworldBasicTable[]> {
  const tables: FateworldBasicTable[] = []
  const tableIds = new Set<string>()
  let totalEntries = 0
  for (const path of manifest.data.tables) {
    const yaml = parseYaml(contents.files.get(path) as Buffer, path)
    if (!yaml.success) return yaml
    const table = parseTable(yaml.value, path, dependencies)
    if (!table.success) return table
    if (tableIds.has(table.value.id)) {
      return failure(issue('DUPLICATE_ID', `El identificador de tabla "${table.value.id}" está duplicado.`, path))
    }
    tableIds.add(table.value.id)
    totalEntries += table.value.entries.length
    if (totalEntries > dependencies.limits.maximumTableEntries) {
      return failure(issue('INVALID_TABLES', `El paquete supera ${dependencies.limits.maximumTableEntries} entradas de tabla.`, path))
    }
    tables.push(table.value)
  }
  return success(Object.freeze(tables))
}

function collectLocalizationLeaves(
  value: unknown,
  prefix: string,
  entry: string,
  leaves: Set<string>,
  dependencies: BasicContractDependencies,
  budget: DeclarativeBudget,
  depth = 0
): FateworldValidationError | undefined {
  budget.nodes += 1
  if (budget.nodes > dependencies.limits.maximumDeclarativeNodes) {
    return issue('INVALID_LOCALIZATION', 'El catálogo supera el límite de nodos declarativos.', entry)
  }
  if (depth > dependencies.limits.maximumDeclarativeDepth) {
    return issue('INVALID_LOCALIZATION', 'El catálogo supera la profundidad admitida.', entry)
  }
  if (typeof value === 'string') {
    if (prefix.length === 0 || value.trim().length === 0 || value.length > dependencies.limits.maximumDeclarativeTextLength || value.includes('\u0000')) {
      return issue('INVALID_LOCALIZATION', 'El catálogo contiene un texto no admitido.', entry)
    }
    if (leaves.has(prefix)) {
      return issue('INVALID_LOCALIZATION', `La clave localizada "${prefix}" está duplicada.`, entry)
    }
    leaves.add(prefix)
    return undefined
  }
  if (!isRecord(value) || Object.keys(value).length === 0) {
    return issue('INVALID_LOCALIZATION', 'Los catálogos solo admiten mapas no vacíos con textos.', entry)
  }
  for (const [key, child] of Object.entries(value)) {
    if (!PROPERTY_KEY_PATTERN.test(key) || key.length > 80 || FORBIDDEN_DATA_KEYS.has(key)) {
      return issue('INVALID_LOCALIZATION', `El catálogo contiene la clave no admitida "${key}".`, entry)
    }
    const error = collectLocalizationLeaves(
      child,
      prefix.length === 0 ? key : `${prefix}.${key}`,
      entry,
      leaves,
      dependencies,
      budget,
      depth + 1
    )
    if (error) return error
  }
  return undefined
}

function validateTableCatalog(
  value: Record<string, unknown>,
  entry: string,
  table: FateworldBasicTable,
  dependencies: BasicContractDependencies,
  entryKeys: Map<string, ReadonlySet<string>>
): FateworldValidationError | undefined {
  const keys = validateExactKeys(
    value,
    ['tableId', 'title'],
    ['help', 'entries', 'optionalEndings'],
    'El catálogo de tabla',
    'INVALID_LOCALIZATION',
    entry
  )
  if (keys) return keys
  const title = validateText(value.title, 'catalog.title', 'INVALID_LOCALIZATION', entry, 500)
  if (!title.success) return title.error
  if (hasOwn(value, 'help')) {
    const help = validateText(
      value.help,
      'catalog.help',
      'INVALID_LOCALIZATION',
      entry,
      dependencies.limits.maximumDeclarativeTextLength
    )
    if (!help.success) return help.error
  }

  if (hasOwn(value, 'entries')) {
    if (!isRecord(value.entries)) {
      return issue('INVALID_LOCALIZATION', 'catalog.entries debe ser un mapa.', entry)
    }
    const validEntryIds = new Set(table.entries.map((candidate) => candidate.id))
    const budget: DeclarativeBudget = { nodes: 0 }
    for (const [entryId, translation] of Object.entries(value.entries)) {
      if (!validEntryIds.has(entryId)) {
        return issue('BROKEN_REFERENCE', `El catálogo referencia la entrada inexistente "${table.id}.${entryId}".`, entry)
      }
      const leaves = new Set<string>()
      const error = collectLocalizationLeaves(
        translation,
        '',
        entry,
        leaves,
        dependencies,
        budget
      )
      if (error) return error
      entryKeys.set(entryId, new Set(leaves))
    }
  }

  if (hasOwn(value, 'optionalEndings')) {
    if (!isRecord(value.optionalEndings)) {
      return issue('INVALID_LOCALIZATION', 'catalog.optionalEndings debe ser un mapa.', entry)
    }
    if (table.optionalEnding === undefined) {
      return issue('BROKEN_REFERENCE', `La tabla "${table.id}" no declara finales opcionales.`, entry)
    }
    const budget: DeclarativeBudget = { nodes: 0 }
    for (const [endingId, translation] of Object.entries(value.optionalEndings)) {
      if (endingId !== table.optionalEnding.id) {
        return issue('BROKEN_REFERENCE', `El catálogo referencia el final opcional inexistente "${endingId}".`, entry)
      }
      const leaves = new Set<string>()
      const error = collectLocalizationLeaves(
        translation,
        '',
        entry,
        leaves,
        dependencies,
        budget
      )
      if (error) return error
    }
  }
  return undefined
}

function parseLocalizations(
  contents: ValidatedArchiveContents,
  manifest: ParsedBasicManifest,
  tables: readonly FateworldBasicTable[],
  dependencies: BasicContractDependencies
): ParseResult<ParsedLocalizations> {
  const tablesById = new Map(tables.map((table) => [table.id, table]))
  const generalKeysByLanguage = new Map<string, ReadonlySet<string>>()
  const tableEntryKeysByLanguage = new Map<
    string,
    ReadonlyMap<string, ReadonlyMap<string, ReadonlySet<string>>>
  >()

  for (const language of manifest.world.languages) {
    const tableCatalogs = new Set<string>()
    const generalLeaves = new Set<string>()
    const tableEntryKeys = new Map<string, ReadonlyMap<string, ReadonlySet<string>>>()
    for (const path of manifest.localization.catalogs[language]) {
      const yaml = parseYaml(contents.files.get(path) as Buffer, path)
      if (!yaml.success) return yaml
      if (!isRecord(yaml.value)) {
        return failure(issue('INVALID_LOCALIZATION', 'Cada catálogo debe ser un mapa YAML.', path))
      }
      if (hasOwn(yaml.value, 'tableId')) {
        if (typeof yaml.value.tableId !== 'string') {
          return failure(issue('INVALID_LOCALIZATION', 'catalog.tableId debe ser un identificador.', path))
        }
        const table = tablesById.get(yaml.value.tableId)
        if (table === undefined) {
          return failure(issue('BROKEN_REFERENCE', `El catálogo referencia la tabla inexistente "${yaml.value.tableId}".`, path))
        }
        if (tableCatalogs.has(table.id)) {
          return failure(issue('DUPLICATE_ID', `El idioma ${language} declara dos catálogos para "${table.id}".`, path))
        }
        const entryKeys = new Map<string, ReadonlySet<string>>()
        const error = validateTableCatalog(yaml.value, path, table, dependencies, entryKeys)
        if (error) return failure(error)
        tableCatalogs.add(table.id)
        tableEntryKeys.set(table.id, entryKeys)
      } else {
        const error = collectLocalizationLeaves(
          yaml.value,
          '',
          path,
          generalLeaves,
          dependencies,
          { nodes: 0 }
        )
        if (error) return failure(error)
      }
    }

    const missingTable = tables.find((table) => !tableCatalogs.has(table.id))
    if (missingTable !== undefined) {
      return failure(
        issue(
          'MISSING_RESOURCE',
          `El idioma ${language} no declara un catálogo para la tabla "${missingTable.id}".`,
          'manifest.yaml'
        )
      )
    }
    generalKeysByLanguage.set(language, generalLeaves)
    tableEntryKeysByLanguage.set(language, tableEntryKeys)
  }
  return success({ generalKeysByLanguage, tableEntryKeysByLanguage })
}

function parseGameplay(
  contents: ValidatedArchiveContents,
  manifest: ParsedBasicManifest,
  tables: readonly FateworldBasicTable[],
  localizations: ParsedLocalizations
): ParseResult<FateworldBasicGameplay> {
  const entry = manifest.data.gameplay
  const yaml = parseYaml(contents.files.get(entry) as Buffer, entry)
  if (!yaml.success) return yaml
  if (!isRecord(yaml.value)) return failure(issue('INVALID_GAMEPLAY', 'gameplay debe ser un mapa.', entry))
  const rootKeys = validateExactKeys(
    yaml.value,
    ['characterCreation', 'tableBindings'],
    [],
    'gameplay',
    'INVALID_GAMEPLAY',
    entry
  )
  if (rootKeys) return failure(rootKeys)
  if (!isRecord(yaml.value.characterCreation)) {
    return failure(issue('INVALID_GAMEPLAY', 'characterCreation debe ser un mapa.', entry))
  }
  const creationKeys = validateExactKeys(
    yaml.value.characterCreation,
    ['nameSelection'],
    [],
    'characterCreation',
    'INVALID_GAMEPLAY',
    entry
  )
  if (creationKeys) return failure(creationKeys)
  if (!isRecord(yaml.value.characterCreation.nameSelection)) {
    return failure(issue('INVALID_GAMEPLAY', 'characterCreation.nameSelection debe ser un mapa.', entry))
  }
  const selection = yaml.value.characterCreation.nameSelection
  const selectionKeys = validateExactKeys(
    selection,
    ['mode', 'options'],
    [],
    'characterCreation.nameSelection',
    'INVALID_GAMEPLAY',
    entry
  )
  if (selectionKeys) return failure(selectionKeys)
  if (selection.mode !== 'choice' || !Array.isArray(selection.options) || selection.options.length === 0 || selection.options.length > 16) {
    return failure(issue('INVALID_GAMEPLAY', 'La selección de nombres debe usar mode choice y opciones no vacías.', entry))
  }

  const tableIds = new Set(tables.map((table) => table.id))
  const optionIds = new Set<string>()
  const options: Array<{ readonly id: string; readonly tableId: string; readonly labelKey: string }> = []
  for (const [index, candidate] of selection.options.entries()) {
    if (!isRecord(candidate)) {
      return failure(issue('INVALID_GAMEPLAY', `nameSelection.options[${index}] debe ser un mapa.`, entry))
    }
    const optionKeys = validateExactKeys(
      candidate,
      ['id', 'tableId', 'labelKey'],
      [],
      `nameSelection.options[${index}]`,
      'INVALID_GAMEPLAY',
      entry
    )
    if (optionKeys) return failure(optionKeys)
    const id = validateIdentifier(candidate.id, 'nameSelection.option.id', 'INVALID_GAMEPLAY', entry, 80)
    if (!id.success) return id
    if (optionIds.has(id.value)) {
      return failure(issue('DUPLICATE_ID', `La opción de nombres "${id.value}" está duplicada.`, entry))
    }
    optionIds.add(id.value)
    if (typeof candidate.tableId !== 'string' || !tableIds.has(candidate.tableId)) {
      return failure(issue('BROKEN_REFERENCE', 'Una opción de nombres referencia una tabla no declarada.', entry))
    }
    if (typeof candidate.labelKey !== 'string' || !LOCALIZATION_KEY_PATTERN.test(candidate.labelKey)) {
      return failure(issue('INVALID_GAMEPLAY', 'nameSelection.option.labelKey no es una clave localizada válida.', entry))
    }
    for (const language of manifest.world.languages) {
      if (!localizations.generalKeysByLanguage.get(language)?.has(candidate.labelKey)) {
        return failure(
          issue(
            'BROKEN_REFERENCE',
            `La clave "${candidate.labelKey}" no existe en los catálogos generales de ${language}.`,
            entry
          )
        )
      }
    }
    options.push({ id: id.value, tableId: candidate.tableId, labelKey: candidate.labelKey })
  }

  if (!isRecord(yaml.value.tableBindings) || Object.keys(yaml.value.tableBindings).length === 0) {
    return failure(issue('INVALID_GAMEPLAY', 'tableBindings debe ser un mapa no vacío.', entry))
  }
  const bindings: Record<string, Readonly<Record<string, string>>> = Object.create(null) as Record<
    string,
    Readonly<Record<string, string>>
  >
  for (const [groupName, groupValue] of Object.entries(yaml.value.tableBindings)) {
    if (!PROPERTY_KEY_PATTERN.test(groupName) || groupName.length > 80 || !isRecord(groupValue) || Object.keys(groupValue).length === 0) {
      return failure(issue('INVALID_GAMEPLAY', `El grupo de bindings "${groupName}" no es válido.`, entry))
    }
    const group: Record<string, string> = Object.create(null) as Record<string, string>
    for (const [bindingName, tableId] of Object.entries(groupValue)) {
      if (!PROPERTY_KEY_PATTERN.test(bindingName) || bindingName.length > 80 || typeof tableId !== 'string') {
        return failure(issue('INVALID_GAMEPLAY', `El binding "${groupName}.${bindingName}" no es válido.`, entry))
      }
      if (!tableIds.has(tableId)) {
        return failure(
          issue(
            'BROKEN_REFERENCE',
            `El binding "${groupName}.${bindingName}" referencia la tabla inexistente "${tableId}".`,
            entry
          )
        )
      }
      group[bindingName] = tableId
    }
    bindings[groupName] = Object.freeze(group)
  }

  return success({
    characterCreation: {
      nameSelection: { mode: 'choice', options: Object.freeze(options) }
    },
    tableBindings: Object.freeze(bindings)
  })
}

function validateMarkdown(source: Buffer, entry: string): FateworldValidationError | undefined {
  let text: string
  try {
    text = utf8Decoder.decode(source)
  } catch {
    return issue('INVALID_UTF8', 'El Markdown debe estar codificado como UTF-8 válido.', entry)
  }
  if (text.includes('\u0000') || ACTIVE_HTML.test(text) || REMOTE_MARKDOWN_TARGET.test(text)) {
    return issue('INVALID_MARKDOWN', 'El Markdown v1 no admite NUL, HTML incrustado ni destinos remotos.', entry)
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

export function isBasicFateworldManifestCandidate(value: unknown): boolean {
  return (
    isRecord(value) &&
    isRecord(value.compatibility) &&
    (hasOwn(value.compatibility, 'engine') || hasOwn(value.compatibility, 'engineVersion'))
  )
}

export function validateBasicFateworldContract(
  manifestValue: unknown,
  contents: ValidatedArchiveContents,
  dependencies: BasicContractDependencies
): FateworldValidationResult {
  const manifest = parseManifest(manifestValue, dependencies)
  if (!manifest.success) return { valid: false, errors: [manifest.error] }

  const declaredFiles = new Set<string>([
    'manifest.yaml',
    manifest.value.data.gameplay,
    ...manifest.value.data.tables,
    ...Object.values(manifest.value.content.descriptions),
    ...Object.values(manifest.value.localization.catalogs).flatMap((paths) => [...paths]),
    ...manifest.value.resources.images
  ])
  for (const path of declaredFiles) {
    if (!contents.files.has(path)) {
      return { valid: false, errors: [issue('MISSING_RESOURCE', `Falta el recurso declarado "${path}".`, path)] }
    }
  }
  for (const path of contents.files.keys()) {
    if (!declaredFiles.has(path)) {
      return { valid: false, errors: [issue('UNDECLARED_RESOURCE', `El archivo "${path}" no está declarado.`, path)] }
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

  const tables = parseTables(contents, manifest.value, dependencies)
  if (!tables.success) return { valid: false, errors: [tables.error] }
  const localizations = parseLocalizations(contents, manifest.value, tables.value, dependencies)
  if (!localizations.success) return { valid: false, errors: [localizations.error] }
  const mechanicsError = validateBasicMechanics(tables.value, {
    tablePaths: manifest.value.data.tables,
    maximumDepth: dependencies.limits.maximumDeclarativeDepth,
    maximumOperations: dependencies.limits.maximumDeclarativeNodes,
    findMissingLocalizationLanguage(tableId, tableEntryId, key) {
      return manifest.value.world.languages.find(
        (language) =>
          !localizations.value.tableEntryKeysByLanguage
            .get(language)
            ?.get(tableId)
            ?.get(tableEntryId)
            ?.has(key)
      )
    }
  })
  if (mechanicsError) return { valid: false, errors: [mechanicsError] }
  const gameplay = parseGameplay(contents, manifest.value, tables.value, localizations.value)
  if (!gameplay.success) return { valid: false, errors: [gameplay.error] }

  return {
    valid: true,
    package: {
      profile: 'basic',
      mechanicalValidation: 'strict-static',
      formatVersion: '1',
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
      localization: manifest.value.localization,
      resources: manifest.value.resources,
      gameplay: gameplay.value,
      tables: tables.value,
      archive: {
        fileCount: contents.fileCount,
        uncompressedBytes: contents.uncompressedBytes
      }
    }
  }
}
