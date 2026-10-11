import {
  BUILTIN_THEME_IDS,
  BUILTIN_WORLD_THEME_IDS,
  getBuiltinThemeAvailability,
  getBuiltinThemeRole,
  parseBuiltinThemeYaml,
  resolveThemeArtwork,
  type ThemeArtworkRole,
  type ThemeArtworkUrls,
  type BuiltinThemeDefinition,
  type BuiltinThemeAvailability,
  type BuiltinThemeId,
  type BuiltinThemeRole,
  type BuiltinWorldThemeId
} from './builtin-theme-schema'

export interface BuiltinTheme extends BuiltinThemeDefinition {
  readonly role: BuiltinThemeRole
  readonly availability: BuiltinThemeAvailability
  readonly installed: false
  readonly isNeutral: boolean
  readonly artworkUrls: ThemeArtworkUrls
  readonly missingArtwork: readonly ThemeArtworkRole[]
}

const yamlSources = import.meta.glob(
  '../../../resources/builtin-themes/{fatebound,ronin,templario,ninja,shaolin,robot,soldado,naves,mundoplato}/theme.yaml',
  {
    eager: true,
    query: '?raw',
    import: 'default'
  }
) as Readonly<Record<string, string>>

const bundledAssetUrls = {
  ...import.meta.glob(
    '../../../resources/builtin-themes/{fatebound,ronin,templario,ninja,shaolin,robot,soldado,naves,mundoplato}/assets/{hero,card}.webp',
    {
      eager: true,
      query: '?url',
      import: 'default'
    }
  ),
  ...import.meta.glob(
    '../../../resources/builtin-themes/{fatebound,ronin,templario,ninja,shaolin,robot,soldado,naves,mundoplato}/assets/{card,emblem}.png',
    {
      eager: true,
      query: '?url',
      import: 'default'
    }
  )
} as Readonly<Record<string, string>>

function findOnlyEntry(entries: Readonly<Record<string, string>>, suffix: string): string {
  const matches = Object.entries(entries).filter(([path]) =>
    path.replaceAll('\\', '/').endsWith(suffix)
  )
  if (matches.length !== 1) {
    throw new Error(`Se esperaba exactamente un recurso empaquetado para ${suffix}`)
  }
  return matches[0][1]
}

function loadBuiltinTheme(id: BuiltinThemeId): BuiltinTheme {
  const rootSuffix = `/resources/builtin-themes/${id}/`
  const source = findOnlyEntry(yamlSources, `${rootSuffix}theme.yaml`)
  const definition = parseBuiltinThemeYaml(source, id)
  const assets: Record<string, string> = Object.create(null) as Record<string, string>

  for (const [path, url] of Object.entries(bundledAssetUrls)) {
    const normalizedPath = path.replaceAll('\\', '/')
    const rootIndex = normalizedPath.lastIndexOf(rootSuffix)
    if (rootIndex === -1) continue
    assets[normalizedPath.slice(rootIndex + rootSuffix.length)] = url
  }

  const artwork = resolveThemeArtwork(definition, assets)
  const isNeutral = id === 'fatebound'
  return Object.freeze({
    ...definition,
    role: getBuiltinThemeRole(id),
    availability: getBuiltinThemeAvailability(id),
    installed: false,
    isNeutral,
    artworkUrls: Object.freeze(artwork.urls),
    missingArtwork: Object.freeze([...artwork.missing])
  })
}

export const BUILTIN_THEMES: readonly BuiltinTheme[] = Object.freeze(
  BUILTIN_THEME_IDS.map(loadBuiltinTheme)
)

function requireWorldTheme(id: BuiltinWorldThemeId): BuiltinTheme {
  const theme = BUILTIN_THEMES.find((candidate) => candidate.id === id)
  if (!theme || theme.role !== 'future-world') {
    throw new Error(`No se encontró el tema integrado del mundo ${id}`)
  }
  return theme
}

export const BUILTIN_WORLD_THEMES: readonly BuiltinTheme[] = Object.freeze(
  BUILTIN_WORLD_THEME_IDS.map(requireWorldTheme)
)

export function resolveBuiltinTheme(value: unknown): BuiltinTheme {
  return BUILTIN_THEMES.find((theme) => theme.id === value) ?? BUILTIN_THEMES[0]
}
