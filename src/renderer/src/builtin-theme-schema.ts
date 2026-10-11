export const BUILTIN_THEME_IDS = [
  'fatebound',
  'ronin',
  'templario',
  'ninja',
  'shaolin',
  'robot',
  'soldado',
  'naves',
  'mundoplato'
] as const

export const BUILTIN_WORLD_THEME_IDS = [
  'ronin',
  'templario',
  'ninja',
  'shaolin',
  'robot',
  'soldado',
  'naves',
  'mundoplato'
] as const

export type BuiltinThemeId = (typeof BUILTIN_THEME_IDS)[number]
export type BuiltinWorldThemeId = (typeof BUILTIN_WORLD_THEME_IDS)[number]
export type BuiltinThemeRole = 'application-base' | 'future-world'
export type BuiltinThemeAvailability = 'application-base' | 'upcoming'
export type ThemeArtworkRole = 'hero' | 'card' | 'emblem'

export interface ThemeColors {
  readonly background: string
  readonly surface: string
  readonly surfaceRaised: string
  readonly primary: string
  readonly secondary: string
  readonly text: string
  readonly textMuted: string
  readonly border: string
  readonly success: string
  readonly warning: string
  readonly danger: string
}

export interface ThemeArtworkDefinition {
  readonly hero: string | null
  readonly card: string | null
  readonly emblem: string | null
}

export interface BuiltinThemeDefinition {
  readonly schemaVersion: 1
  readonly status: 'builtin-theme'
  readonly playable: false
  readonly id: BuiltinThemeId
  readonly displayName: string
  readonly tagline: string
  readonly presentation: {
    readonly category: string
    readonly description: string
    readonly atmosphere: string
  }
  readonly visual: {
    readonly mode: 'dark'
    readonly mood: string
    readonly motif: string
    readonly colors: ThemeColors
    readonly typography: {
      readonly headingRole: 'display'
      readonly bodyRole: 'readable'
    }
    readonly artwork: ThemeArtworkDefinition
    readonly effects: {
      readonly motion: 'subtle' | 'none'
      readonly backgroundTexture: 'subtle' | 'none'
    }
  }
}

export interface ThemeArtworkUrls {
  readonly hero?: string
  readonly card?: string
  readonly emblem?: string
}

export interface ResolvedThemeArtwork {
  readonly urls: ThemeArtworkUrls
  readonly missing: readonly ThemeArtworkRole[]
}

type YamlMap = Record<string, unknown>

const THEME_ID_SET = new Set<string>(BUILTIN_THEME_IDS)
const WORLD_THEME_ID_SET = new Set<string>(BUILTIN_WORLD_THEME_IDS)
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const FORBIDDEN_YAML_PATTERN = /(^|\s)(?:---|\.\.\.|<<:|[!&*]|[>|][+-]?\s*$)/m
const ARTWORK_PATTERNS: Readonly<Record<ThemeArtworkRole, RegExp>> = Object.freeze({
  hero: /^assets\/hero\.webp$/,
  card: /^assets\/card\.(?:webp|png)$/,
  emblem: /^assets\/emblem\.png$/
})

export class BuiltinThemeValidationError extends Error {
  constructor(message: string) {
    super(`Tema integrado no válido: ${message}`)
    this.name = 'BuiltinThemeValidationError'
  }
}

function fail(message: string): never {
  throw new BuiltinThemeValidationError(message)
}

function parseScalar(rawValue: string, lineNumber: number): unknown {
  if (rawValue === 'null') return null
  if (rawValue === 'true') return true
  if (rawValue === 'false') return false
  if (/^(?:0|[1-9]\d*)$/.test(rawValue)) return Number(rawValue)

  if (rawValue.startsWith("'") || rawValue.endsWith("'")) {
    if (!(rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2)) {
      fail(`cadena simple incompleta en la línea ${lineNumber}`)
    }
    return rawValue.slice(1, -1).replaceAll("''", "'")
  }

  if (rawValue.startsWith('"') || rawValue.endsWith('"')) {
    if (!(rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2)) {
      fail(`cadena doble incompleta en la línea ${lineNumber}`)
    }
    try {
      return JSON.parse(rawValue) as unknown
    } catch {
      fail(`cadena doble no válida en la línea ${lineNumber}`)
    }
  }

  if (rawValue.includes(':') || rawValue.includes('#')) {
    fail(`valor sin comillas no admitido en la línea ${lineNumber}`)
  }

  return rawValue
}

function parseRestrictedYaml(source: string): YamlMap {
  if (source.length > 32_768) fail('el YAML supera el límite de 32 KiB')
  if (source.includes('\t')) fail('no se permiten tabuladores')
  if (
    FORBIDDEN_YAML_PATTERN.test(source) ||
    ['[', ']', '{', '}'].some((character) => source.includes(character))
  ) {
    fail('contiene construcciones YAML fuera del subconjunto permitido')
  }

  const root: YamlMap = Object.create(null) as YamlMap
  const stack: Array<{ indent: number; value: YamlMap }> = [{ indent: -2, value: root }]

  for (const [index, originalLine] of source
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/u)
    .entries()) {
    const lineNumber = index + 1
    const trimmed = originalLine.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const indent = originalLine.length - originalLine.trimStart().length
    if (indent % 2 !== 0) fail(`sangría no válida en la línea ${lineNumber}`)

    const match = trimmed.match(/^([A-Za-z][A-Za-z0-9]*):(?:\s+(.*))?$/u)
    if (!match) fail(`sintaxis no admitida en la línea ${lineNumber}`)

    while (stack.length > 1 && stack.at(-1)!.indent >= indent) stack.pop()
    const parent = stack.at(-1)!
    if (indent !== parent.indent + 2) fail(`salto de sangría no válido en la línea ${lineNumber}`)

    const key = match[1]
    if (Object.hasOwn(parent.value, key)) fail(`clave duplicada ${key} en la línea ${lineNumber}`)
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      fail(`clave reservada en la línea ${lineNumber}`)
    }

    if (match[2] === undefined || match[2] === '') {
      const child: YamlMap = Object.create(null) as YamlMap
      parent.value[key] = child
      stack.push({ indent, value: child })
    } else {
      parent.value[key] = parseScalar(match[2], lineNumber)
    }
  }

  return root
}

function expectMap(value: unknown, context: string): YamlMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${context} debe ser un mapa`)
  }
  return value as YamlMap
}

function expectKeys(map: YamlMap, expected: readonly string[], context: string): void {
  const actual = Object.keys(map).sort()
  const allowed = [...expected].sort()
  if (actual.length !== allowed.length || actual.some((key, index) => key !== allowed[index])) {
    fail(`${context} debe contener exactamente: ${expected.join(', ')}`)
  }
}

function expectString(value: unknown, context: string, maxLength = 180): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    fail(`${context} debe ser texto no vacío sin espacios exteriores`)
  }
  const containsControlCharacter = [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint < 32 || codePoint === 127
  })
  if (value.length > maxLength || containsControlCharacter) {
    fail(`${context} contiene texto no admitido`)
  }
  return value
}

function expectLiteral<T extends string | number | boolean>(
  value: unknown,
  expected: T,
  context: string
): T {
  if (value !== expected) fail(`${context} debe ser ${String(expected)}`)
  return expected
}

function expectEnum<T extends string>(value: unknown, allowed: readonly T[], context: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(`${context} debe ser uno de: ${allowed.join(', ')}`)
  }
  return value as T
}

function expectColor(value: unknown, context: string): string {
  const color = expectString(value, context, 7)
  if (!HEX_COLOR_PATTERN.test(color)) fail(`${context} debe usar #RRGGBB`)
  return color.toUpperCase()
}

export function isSafeThemeArtworkPath(value: unknown, role?: ThemeArtworkRole): value is string {
  if (typeof value !== 'string' || value.includes('\\') || value.includes('..')) return false
  if (value.startsWith('/') || /^[A-Za-z]:/u.test(value) || /[?#%]/u.test(value)) return false
  return role
    ? ARTWORK_PATTERNS[role].test(value)
    : Object.values(ARTWORK_PATTERNS).some((pattern) => pattern.test(value))
}

function expectArtworkPath(value: unknown, role: ThemeArtworkRole): string | null {
  if (value === null) return null
  if (!isSafeThemeArtworkPath(value, role)) {
    fail(`visual.artwork.${role} debe ser una ruta relativa permitida para ese recurso`)
  }
  return value
}

export function parseBuiltinThemeYaml(
  source: string,
  expectedId?: BuiltinThemeId
): BuiltinThemeDefinition {
  const root = parseRestrictedYaml(source)
  expectKeys(
    root,
    [
      'schemaVersion',
      'status',
      'playable',
      'id',
      'displayName',
      'tagline',
      'presentation',
      'visual'
    ],
    'la raíz'
  )

  const idValue = expectString(root.id, 'id', 32)
  if (!THEME_ID_SET.has(idValue)) fail(`id no permitido: ${idValue}`)
  const id = idValue as BuiltinThemeId
  if (expectedId !== undefined && id !== expectedId) {
    fail(`el id ${id} no coincide con el directorio ${expectedId}`)
  }

  const presentation = expectMap(root.presentation, 'presentation')
  expectKeys(presentation, ['category', 'description', 'atmosphere'], 'presentation')

  const visual = expectMap(root.visual, 'visual')
  expectKeys(
    visual,
    ['mode', 'mood', 'motif', 'colors', 'typography', 'artwork', 'effects'],
    'visual'
  )

  const colors = expectMap(visual.colors, 'visual.colors')
  const colorKeys = [
    'background',
    'surface',
    'surfaceRaised',
    'primary',
    'secondary',
    'text',
    'textMuted',
    'border',
    'success',
    'warning',
    'danger'
  ] as const
  expectKeys(colors, colorKeys, 'visual.colors')

  const typography = expectMap(visual.typography, 'visual.typography')
  expectKeys(typography, ['headingRole', 'bodyRole'], 'visual.typography')

  const artwork = expectMap(visual.artwork, 'visual.artwork')
  expectKeys(artwork, ['hero', 'card', 'emblem'], 'visual.artwork')

  const effects = expectMap(visual.effects, 'visual.effects')
  expectKeys(effects, ['motion', 'backgroundTexture'], 'visual.effects')

  return {
    schemaVersion: expectLiteral(root.schemaVersion, 1, 'schemaVersion'),
    status: expectLiteral(root.status, 'builtin-theme', 'status'),
    playable: expectLiteral(root.playable, false, 'playable'),
    id,
    displayName: expectString(root.displayName, 'displayName', 48),
    tagline: expectString(root.tagline, 'tagline', 90),
    presentation: {
      category: expectString(presentation.category, 'presentation.category', 64),
      description: expectString(presentation.description, 'presentation.description', 240),
      atmosphere: expectString(presentation.atmosphere, 'presentation.atmosphere', 96)
    },
    visual: {
      mode: expectLiteral(visual.mode, 'dark', 'visual.mode'),
      mood: expectString(visual.mood, 'visual.mood', 40),
      motif: expectString(visual.motif, 'visual.motif', 40),
      colors: Object.fromEntries(
        colorKeys.map((key) => [key, expectColor(colors[key], `visual.colors.${key}`)])
      ) as unknown as ThemeColors,
      typography: {
        headingRole: expectLiteral(
          typography.headingRole,
          'display',
          'visual.typography.headingRole'
        ),
        bodyRole: expectLiteral(typography.bodyRole, 'readable', 'visual.typography.bodyRole')
      },
      artwork: {
        hero: expectArtworkPath(artwork.hero, 'hero'),
        card: expectArtworkPath(artwork.card, 'card'),
        emblem: expectArtworkPath(artwork.emblem, 'emblem')
      },
      effects: {
        motion: expectEnum(effects.motion, ['subtle', 'none'], 'visual.effects.motion'),
        backgroundTexture: expectEnum(
          effects.backgroundTexture,
          ['subtle', 'none'],
          'visual.effects.backgroundTexture'
        )
      }
    }
  }
}

export function resolveThemeArtwork(
  definition: BuiltinThemeDefinition,
  bundledAssets: Readonly<Record<string, string>>
): ResolvedThemeArtwork {
  const urls: Partial<Record<ThemeArtworkRole, string>> = {}
  const missing: ThemeArtworkRole[] = []

  for (const role of ['hero', 'card', 'emblem'] as const) {
    const path = definition.visual.artwork[role]
    if (path === null) continue
    const url = bundledAssets[path]
    if (typeof url === 'string' && url.length > 0) urls[role] = url
    else missing.push(role)
  }

  return { urls, missing }
}

export function isBuiltinWorldThemeId(value: unknown): value is BuiltinWorldThemeId {
  return typeof value === 'string' && WORLD_THEME_ID_SET.has(value)
}

export function getBuiltinThemeRole(id: BuiltinThemeId): BuiltinThemeRole {
  return isBuiltinWorldThemeId(id) ? 'future-world' : 'application-base'
}

export function getBuiltinThemeAvailability(id: BuiltinThemeId): BuiltinThemeAvailability {
  return isBuiltinWorldThemeId(id) ? 'upcoming' : 'application-base'
}
