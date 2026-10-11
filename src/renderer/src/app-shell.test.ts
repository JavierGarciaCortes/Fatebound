import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  APP_SECTIONS,
  DEFAULT_BUILTIN_THEME_ID,
  getContextualNavigationSections,
  resolveBuiltinThemeId,
  resolveNavigationTarget,
  resolveSectionId
} from './app-shell.ts'
import {
  BUILTIN_THEME_IDS,
  BUILTIN_WORLD_THEME_IDS,
  BuiltinThemeValidationError,
  getBuiltinThemeAvailability,
  getBuiltinThemeRole,
  isSafeThemeArtworkPath,
  parseBuiltinThemeYaml,
  resolveThemeArtwork,
  type BuiltinThemeDefinition,
  type BuiltinThemeId,
  type ThemeArtworkRole
} from './builtin-theme-schema.ts'

const themesDirectory = fileURLToPath(
  new URL('../../../resources/builtin-themes/', import.meta.url)
)
const brandingDirectory = fileURLToPath(
  new URL('../../../resources/branding/fatebound/', import.meta.url)
)
const appSource = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')
const catalogSource = readFileSync(new URL('./builtin-theme-catalog.ts', import.meta.url), 'utf8')

function loadThemeDefinition(id: BuiltinThemeId): BuiltinThemeDefinition {
  const source = readFileSync(`${themesDirectory}/${id}/theme.yaml`, 'utf8')
  return parseBuiltinThemeYaml(source, id)
}

test('the shell separates global destinations from contextual navigation', () => {
  assert.deepEqual(
    Object.values(APP_SECTIONS).map((section) => section.id),
    ['home', 'worlds', 'characters', 'chronicles', 'settings']
  )
  assert.deepEqual(
    getContextualNavigationSections(null).map((section) => section.id),
    ['worlds']
  )
  assert.deepEqual(
    getContextualNavigationSections({ worldId: 'future-world', worldVersion: '1.0.0' }).map(
      (section) => section.id
    ),
    ['worlds', 'characters', 'chronicles']
  )
  assert.equal(resolveSectionId('settings'), 'settings')
  assert.equal(resolveSectionId('unknown'), 'home')
})

test('all nine allowlisted built-in YAML themes exist and validate', () => {
  assert.deepEqual(BUILTIN_THEME_IDS, [
    'fatebound',
    'ronin',
    'templario',
    'ninja',
    'shaolin',
    'robot',
    'soldado',
    'naves',
    'mundoplato'
  ])
  assert.deepEqual(BUILTIN_WORLD_THEME_IDS, [
    'ronin',
    'templario',
    'ninja',
    'shaolin',
    'robot',
    'soldado',
    'naves',
    'mundoplato'
  ])

  const directoryIds = readdirSync(themesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  assert.deepEqual(directoryIds, [...BUILTIN_THEME_IDS].sort())
  assert.equal(new Set<string>(directoryIds).has('paladin'), false)

  for (const id of BUILTIN_THEME_IDS) {
    const source = readFileSync(`${themesDirectory}/${id}/theme.yaml`, 'utf8')
    const definition = parseBuiltinThemeYaml(source, id)
    assert.equal(definition.id, id)
    assert.equal(definition.status, 'builtin-theme')
    assert.equal(definition.playable, false)
    assert.match(definition.visual.colors.primary, /^#[A-F0-9]{6}$/)
    assert.doesNotMatch(source, /^(?:displayName|tagline|presentation):/m)

    const bundledAssets: Record<string, string> = {}
    for (const role of ['hero', 'card', 'emblem'] as const) {
      const relativePath = definition.visual.artwork[role]
      assert.notEqual(relativePath, null, `${id} debe declarar ${role}`)
      assert.equal(isSafeThemeArtworkPath(relativePath, role), true)
      const assetPath = `${themesDirectory}/${id}/${relativePath}`
      assert.equal(statSync(assetPath).isFile(), true)
      bundledAssets[relativePath!] = `asset:${id}:${role}`
    }

    const artwork = resolveThemeArtwork(definition, bundledAssets)
    assert.deepEqual(artwork.missing, [])
    assert.equal(Object.keys(artwork.urls).length, 3)
  }
})

test('the world catalog contains eight upcoming worlds and excludes neutral Fatebound', () => {
  assert.equal(BUILTIN_WORLD_THEME_IDS.length, 8)
  assert.equal(BUILTIN_WORLD_THEME_IDS.includes('fatebound' as never), false)
  assert.equal(getBuiltinThemeRole('fatebound'), 'application-base')
  assert.equal(getBuiltinThemeAvailability('fatebound'), 'application-base')

  for (const id of BUILTIN_WORLD_THEME_IDS) {
    assert.equal(getBuiltinThemeRole(id), 'future-world')
    assert.equal(getBuiltinThemeAvailability(id), 'upcoming')
  }

  assert.match(appSource, /v-for="theme in BUILTIN_WORLD_THEMES"/)
  assert.match(appSource, /common\.upcoming/)
})

test('the integrated catalog loads only allowlisted resources from builtin-themes', () => {
  assert.match(catalogSource, /resources\/builtin-themes/)
  assert.doesNotMatch(catalogSource, /resources\/theme-previews/)
})

test('the new Fatebound branding exists and remains a keyboard-capable Home button', () => {
  for (const fileName of [
    'fatebound-emblem.png',
    'fatebound-symbol.png',
    'fatebound-logo-horizontal.png',
    'fatebound-logo-light.png',
    'fatebound-logo-dark.png',
    'fatebound-app-icon.png'
  ]) {
    assert.equal(statSync(`${brandingDirectory}/${fileName}`).isFile(), true)
  }

  assert.match(
    appSource,
    /class="brand-lockup"[\s\S]*?type="button"[\s\S]*?@click="navigateTo\('home'\)"/
  )
  assert.match(appSource, /:class="\{ 'brand-lockup--active': activeSection === 'home' \}"/)
  assert.match(appSource, /mainContent\.value\?\.scrollTo\(\{ top: 0, left: 0 \}\)/)
})

test('future-world cards select atmosphere without offering playable actions', () => {
  assert.match(appSource, /@click="selectTheme\(theme\.id\)"/)
  assert.doesNotMatch(appSource, />\s*(?:Jugar|Instalar|Abrir mundo)\s*</)
  assert.deepEqual(
    getContextualNavigationSections(null).map((section) => section.id),
    ['worlds']
  )
})

test('Settings exposes manual backup export without collecting a renderer path', () => {
  assert.match(appSource, /window\.api\.storage\.exportSqliteBackup\(\)/)
  assert.match(appSource, /settings\.export\.action/)
  assert.doesNotMatch(appSource, /type="file"/)
})

test('the initial theme and invalid selections resolve to neutral Fatebound', () => {
  assert.equal(DEFAULT_BUILTIN_THEME_ID, 'fatebound')
  assert.equal(resolveBuiltinThemeId(undefined), 'fatebound')
  assert.equal(resolveBuiltinThemeId('unknown'), 'fatebound')
})

test('theme changes stay in the allowlist and can return to neutral', () => {
  assert.equal(resolveBuiltinThemeId('ninja'), 'ninja')
  assert.equal(resolveBuiltinThemeId('mundoplato'), 'mundoplato')
  assert.equal(resolveBuiltinThemeId(DEFAULT_BUILTIN_THEME_ID), 'fatebound')
})

test('global navigation preserves the selected theme without unlocking world sections', () => {
  const target = resolveNavigationTarget('home', 'ninja')

  assert.deepEqual(target, { sectionId: 'home', activeThemeId: 'ninja' })
  assert.deepEqual(
    getContextualNavigationSections(null).map((section) => section.id),
    ['worlds']
  )
})

test('theme artwork paths cannot escape their controlled directory', () => {
  const source = readFileSync(`${themesDirectory}/fatebound/theme.yaml`, 'utf8')
  const unsafeSource = source.replace('assets/hero.webp', '../hero.webp')

  assert.equal(isSafeThemeArtworkPath('assets/hero.webp', 'hero'), true)
  assert.equal(isSafeThemeArtworkPath('assets/card.png', 'card'), true)
  assert.equal(isSafeThemeArtworkPath('../hero.webp', 'hero'), false)
  assert.equal(isSafeThemeArtworkPath('assets\\hero.webp', 'hero'), false)
  assert.equal(isSafeThemeArtworkPath('C:/hero.webp', 'hero'), false)
  assert.equal(isSafeThemeArtworkPath('assets/hero.webp?remote=1', 'hero'), false)
  assert.throws(() => parseBuiltinThemeYaml(unsafeSource, 'fatebound'), BuiltinThemeValidationError)
})

test('missing packaged artwork degrades per role without invalidating the theme', () => {
  const definition = loadThemeDefinition('robot')
  const artwork = resolveThemeArtwork(definition, {
    'assets/hero.webp': 'asset:robot:hero'
  })

  assert.equal(artwork.urls.hero, 'asset:robot:hero')
  assert.equal(artwork.urls.card, undefined)
  assert.equal(artwork.urls.emblem, undefined)
  assert.deepEqual(artwork.missing, ['card', 'emblem'] satisfies ThemeArtworkRole[])
})

test('built-in theme YAML cannot claim playable or add executable fields', () => {
  const source = readFileSync(`${themesDirectory}/ronin/theme.yaml`, 'utf8')
  assert.throws(
    () => parseBuiltinThemeYaml(source.replace('playable: false', 'playable: true'), 'ronin'),
    BuiltinThemeValidationError
  )
  assert.throws(
    () => parseBuiltinThemeYaml(`${source}\nscript: launch.js\n`, 'ronin'),
    BuiltinThemeValidationError
  )
})
