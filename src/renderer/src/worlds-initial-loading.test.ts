import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

test('keeps an unresolved world catalog distinct from upcoming worlds', () => {
  assert.match(
    appSource,
    /type WorldPackageCatalogPhase = 'not-requested' \| 'loading' \| 'ready' \| 'error'/,
  )
  assert.match(
    appSource,
    /themeId !== DEFAULT_BUILTIN_THEME_ID[\s\S]*?return 'loading'[\s\S]*?return 'catalog-error'[\s\S]*?return packagesForTheme\(themeId\)\.length > 0 \? 'package-available' : 'upcoming'/,
  )
  assert.match(appSource, /availability === 'loading'[\s\S]*?t\('worlds\.catalog\.refreshing'\)/)
  assert.match(appSource, /availability === 'catalog-error'[\s\S]*?t\('worlds\.catalog\.error'\)/)
})

test('waits for installed artwork and preserves the built-in fallback after a real failure', () => {
  const resolverStart = appSource.indexOf('function artworkUrl(')
  const resolverEnd = appSource.indexOf('function artworkEventUrl(', resolverStart)

  assert.notEqual(resolverStart, -1, 'artworkUrl must remain the single artwork resolver')
  assert.notEqual(resolverEnd, -1, 'the artwork resolver must have a bounded implementation')

  const artworkResolver = appSource.slice(resolverStart, resolverEnd)
  const unresolvedCatalog = artworkResolver.indexOf(
    "worldPackageCatalogPhase.value === 'not-requested'",
  )
  const unresolvedArtwork = artworkResolver.indexOf('return undefined', unresolvedCatalog)
  const installedArtwork = artworkResolver.indexOf('installedArtworkPackageForTheme')
  const installedFailureCheck = artworkResolver.indexOf(
    'failedArtwork.value.includes(`${theme.id}:${role}:${installedUrl}`)',
  )
  const builtInFallback = artworkResolver.indexOf('theme.artworkUrls[role]')

  assert.match(artworkResolver, /!theme\.isNeutral/)
  assert.match(artworkResolver, /worldPackageCatalogPhase\.value === 'loading'/)
  assert.ok(unresolvedCatalog < unresolvedArtwork)
  assert.ok(unresolvedArtwork < installedArtwork)
  assert.ok(installedArtwork < installedFailureCheck)
  assert.ok(installedFailureCheck < builtInFallback)
  assert.match(appSource, /function markArtworkUnavailable\([\s\S]*?failedArtwork\.value/)
  assert.match(appSource, /function isInstalledArtworkPending\(/)
  assert.match(appSource, /@load="markArtworkLoaded"/)
})
