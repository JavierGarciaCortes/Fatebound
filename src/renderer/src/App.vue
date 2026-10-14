<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type {
  StorageDiagnosticsFailure,
  StorageDiagnosticsResult
} from '../../shared/storage-diagnostics'
import type { ApplicationLanguage } from '../../shared/application-language'
import type { SqliteManualExportResult } from '../../shared/sqlite-manual-export'
import type {
  SqliteRestoreBackupReason,
  SqliteRestoreCancellationResult,
  SqliteRestoreConfirmationResult,
  SqliteRestoreErrorCode,
  SqliteRestoreSelectionResult
} from '../../shared/sqlite-safe-restore'
import type { MessageKey } from '../../shared/i18n'
import {
  resolveKnownWorldPresentationId,
  type AvailableWorldPackage,
  type WorldPackageCatalogIssue,
  type WorldPackageCatalogResult
} from '../../shared/world-package-catalog'
import brandLogoHorizontal from '../../../resources/branding/fatebound/fatebound-logo-horizontal.png'
import brandSymbol from '../../../resources/branding/fatebound/fatebound-symbol.png'
import AppIcon from './components/AppIcon.vue'
import {
  DEFAULT_BUILTIN_THEME_ID,
  getContextualNavigationSections,
  resolveBuiltinThemeId,
  resolveNavigationTarget,
  type AppSectionId,
  type InstalledWorldNavigationContext
} from './app-shell'
import {
  BUILTIN_WORLD_THEMES,
  resolveBuiltinTheme,
  type BuiltinTheme
} from './builtin-theme-catalog'
import type { BuiltinThemeId, ThemeArtworkRole } from './builtin-theme-schema'
import { useI18n, type LanguagePreferenceState } from './i18n'

const { language, preferenceState, availableLanguages, t, selectLanguage } = useI18n()

const activeSection = ref<AppSectionId>('home')
const activeThemeId = ref<BuiltinThemeId>(DEFAULT_BUILTIN_THEME_ID)
const activeInstalledWorld = ref<InstalledWorldNavigationContext | null>(null)
const mainContent = ref<HTMLElement | null>(null)
const diagnostics = ref<StorageDiagnosticsResult | null>(null)
const diagnosticsLoading = ref(false)
const backupExportResult = ref<SqliteManualExportResult | null>(null)
const backupExporting = ref(false)
const backupRestoreSelection = ref<SqliteRestoreSelectionResult | null>(null)
const backupRestoreAction = ref<
  SqliteRestoreConfirmationResult | SqliteRestoreCancellationResult | null
>(null)
const backupRestoreSelecting = ref(false)
const backupRestoring = ref(false)
const failedArtwork = ref<readonly string[]>([])
const worldPackageCatalog = ref<WorldPackageCatalogResult | null>(null)
const worldPackageCatalogLoading = ref(false)

const activeTheme = computed(() => resolveBuiltinTheme(activeThemeId.value))
const activeWorldTheme = computed(() =>
  activeTheme.value.role === 'future-world' ? activeTheme.value : null
)
const availableWorldPackages = computed(() =>
  worldPackageCatalog.value?.status === 'ready' ? worldPackageCatalog.value.packages : []
)
const additionalWorldPackages = computed(() =>
  availableWorldPackages.value.filter(
    (packageInfo) => resolveKnownWorldPresentationId(packageInfo.worldId) === undefined
  )
)
const selectedThemePackages = computed(() =>
  activeWorldTheme.value === null ? [] : packagesForTheme(activeWorldTheme.value.id)
)
const visibleNavigationSections = computed(() =>
  getContextualNavigationSections(activeInstalledWorld.value)
)
const themeStyle = computed<Record<string, string>>(() => ({
  '--text-primary': activeTheme.value.visual.colors.text,
  '--text-secondary': activeTheme.value.visual.colors.textMuted,
  '--text-muted': `color-mix(in srgb, ${activeTheme.value.visual.colors.textMuted} 72%, transparent)`,
  '--theme-accent': activeTheme.value.visual.colors.primary,
  '--theme-accent-strong': activeTheme.value.visual.colors.primary,
  '--theme-accent-soft': activeTheme.value.visual.colors.secondary,
  '--theme-accent-rgb': hexToRgb(activeTheme.value.visual.colors.primary),
  '--theme-background': activeTheme.value.visual.colors.background,
  '--theme-background-raised': activeTheme.value.visual.colors.surface,
  '--theme-surface': activeTheme.value.visual.colors.surfaceRaised,
  '--theme-border': activeTheme.value.visual.colors.border,
  '--success': activeTheme.value.visual.colors.success,
  '--danger': activeTheme.value.visual.colors.danger
}))
const languageStatusKey = computed<MessageKey | null>(() => {
  const keys: Partial<Record<LanguagePreferenceState, MessageKey>> = {
    invalid: 'settings.language.invalid',
    'load-error': 'settings.language.loadError',
    saving: 'settings.language.saving',
    saved: 'settings.language.saved',
    'save-error': 'settings.language.saveError'
  }
  return keys[preferenceState.value] ?? null
})
const backupExportMessage = computed(() => {
  if (backupExporting.value) return t('settings.export.working')

  const result = backupExportResult.value
  if (result === null) return null
  if (result.status === 'success') {
    return t('settings.export.success', { backupName: result.backupDirectoryName })
  }
  if (result.status === 'cancelled') return t('settings.export.cancelled')
  if (result.code === 'destination-not-allowed') {
    return t('settings.export.destinationError')
  }
  if (result.code === 'destination-unavailable') {
    return t('settings.export.destinationUnavailableError')
  }
  if (result.code === 'export-in-progress') return t('settings.export.inProgressError')
  return t('settings.export.genericError')
})
const backupExportFailed = computed(() => backupExportResult.value?.status === 'error')
const backupRestorePreview = computed(() => {
  const selection = backupRestoreSelection.value
  return selection?.status === 'ready' ? selection.backup : null
})
const backupRestoreBusy = computed(() => backupRestoreSelecting.value || backupRestoring.value)
const backupRestoreMessage = computed(() => {
  if (backupRestoreSelecting.value) return t('settings.restore.selecting')
  if (backupRestoring.value) return t('settings.restore.working')

  const action = backupRestoreAction.value
  if (action?.status === 'success') return t('settings.restore.success')
  if (action?.status === 'cancelled') return t('settings.restore.selectionCancelled')
  if (action?.status === 'error') return restoreErrorMessage(action.code)

  const selection = backupRestoreSelection.value
  if (selection?.status === 'cancelled') return t('settings.restore.selectionCancelled')
  if (selection?.status === 'error') return restoreErrorMessage(selection.code)
  return null
})
const backupRestoreFailed = computed(
  () =>
    backupRestoreSelection.value?.status === 'error' ||
    backupRestoreAction.value?.status === 'error'
)
const worldPackageCatalogStatus = computed(() => {
  if (worldPackageCatalogLoading.value) return t('worlds.catalog.refreshing')
  const catalog = worldPackageCatalog.value
  if (catalog === null) return null
  if (catalog.status === 'error') return t('worlds.catalog.error')
  return t('worlds.catalog.summary', {
    packages: catalog.packages.length,
    issues: catalog.issues.length
  })
})

type WorldLibraryAvailability = 'upcoming' | 'package-available' | 'installed'

function navigationLabel(sectionId: AppSectionId): string {
  return t(`navigation.${sectionId}.label` as MessageKey)
}

function navigationDescription(sectionId: AppSectionId): string {
  return t(`navigation.${sectionId}.description` as MessageKey)
}

const languageNameKeys: Readonly<Record<ApplicationLanguage, MessageKey>> = {
  es: 'settings.language.es',
  en: 'settings.language.en',
  ko: 'settings.language.ko'
}

function languageName(value: ApplicationLanguage): string {
  return t(languageNameKeys[value])
}

function themeText(
  themeId: BuiltinThemeId,
  field: 'name' | 'tagline' | 'category' | 'description' | 'atmosphere'
): string {
  return t(`theme.${themeId}.${field}` as MessageKey)
}

function packagesForTheme(themeId: BuiltinThemeId): readonly AvailableWorldPackage[] {
  return availableWorldPackages.value.filter(
    (packageInfo) => resolveKnownWorldPresentationId(packageInfo.worldId) === themeId
  )
}

function worldThemeAvailability(themeId: BuiltinThemeId): WorldLibraryAvailability {
  const installedWorld = activeInstalledWorld.value
  if (
    installedWorld !== null &&
    resolveKnownWorldPresentationId(installedWorld.worldId) === themeId
  ) {
    return 'installed'
  }
  return packagesForTheme(themeId).length > 0 ? 'package-available' : 'upcoming'
}

function availabilityLabel(availability: WorldLibraryAvailability): string {
  const keys: Readonly<Record<WorldLibraryAvailability, MessageKey>> = {
    upcoming: 'common.upcoming',
    'package-available': 'common.packageAvailable',
    installed: 'common.installed'
  }
  return t(keys[availability])
}

function packageTitle(packageInfo: AvailableWorldPackage): string {
  return (
    packageInfo.titles[language.value] ??
    packageInfo.titles[packageInfo.defaultLanguage] ??
    packageInfo.worldId
  )
}

function packageLanguages(packageInfo: AvailableWorldPackage): string {
  return packageInfo.languages.join(', ')
}

function packageVersions(packages: readonly AvailableWorldPackage[]): string {
  return packages.map((packageInfo) => packageInfo.worldVersion).join(', ')
}

function catalogIssueFiles(issue: WorldPackageCatalogIssue): string {
  return issue.fileNames.join(', ')
}

function catalogIssueMessage(issue: WorldPackageCatalogIssue): string {
  if (issue.kind === 'duplicate') return t('worlds.catalog.issue.duplicate')
  if (issue.kind === 'incompatible') return t('worlds.catalog.issue.incompatible')
  return issue.retryable
    ? t('worlds.catalog.issue.temporary')
    : t('worlds.catalog.issue.invalid')
}

function hexToRgb(value: string): string {
  const color = Number.parseInt(value.slice(1), 16)
  return `${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}`
}

function selectTheme(themeId: BuiltinThemeId): void {
  activeThemeId.value = resolveBuiltinThemeId(themeId)
}

function returnToNeutralTheme(): void {
  selectTheme(DEFAULT_BUILTIN_THEME_ID)
}

function artworkUrl(theme: BuiltinTheme, role: ThemeArtworkRole): string | undefined {
  const key = `${theme.id}:${role}`
  return failedArtwork.value.includes(key) ? undefined : theme.artworkUrls[role]
}

function markArtworkUnavailable(themeId: BuiltinThemeId, role: ThemeArtworkRole): void {
  const key = `${themeId}:${role}`
  if (!failedArtwork.value.includes(key)) failedArtwork.value = [...failedArtwork.value, key]
}

async function navigateTo(sectionId: AppSectionId): Promise<void> {
  const target = resolveNavigationTarget(sectionId, activeThemeId.value)
  activeSection.value = target.sectionId
  activeThemeId.value = target.activeThemeId

  if (activeSection.value === 'settings' && diagnostics.value === null) {
    void loadDiagnostics()
  }
  if (activeSection.value === 'worlds' && worldPackageCatalog.value === null) {
    void loadWorldPackageCatalog()
  }

  await nextTick()
  mainContent.value?.scrollTo({ top: 0, left: 0 })
  mainContent.value?.focus()
}

async function loadWorldPackageCatalog(): Promise<void> {
  if (worldPackageCatalogLoading.value) return

  worldPackageCatalogLoading.value = true

  try {
    worldPackageCatalog.value = await window.api.worlds.getPackageCatalog()
  } catch {
    worldPackageCatalog.value = { status: 'error', code: 'catalog-unavailable' }
  } finally {
    worldPackageCatalogLoading.value = false
  }
}

async function loadDiagnostics(): Promise<void> {
  if (diagnosticsLoading.value) return

  diagnosticsLoading.value = true

  try {
    diagnostics.value = await window.api.storage.getDiagnostics()
  } catch {
    const failure: StorageDiagnosticsFailure = {
      status: 'error',
      code: 'diagnostics-unavailable'
    }
    diagnostics.value = failure
  } finally {
    diagnosticsLoading.value = false
  }
}

function formatCheckedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(applicationLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function applicationLocale(): string {
  const dateLocales: Readonly<Record<ApplicationLanguage, string>> = {
    es: 'es-ES',
    en: 'en-GB',
    ko: 'ko-KR'
  }
  return dateLocales[language.value]
}

function formatFileSize(value: number): string {
  return `${new Intl.NumberFormat(applicationLocale()).format(value)} B`
}

function formatBackupReason(reason: SqliteRestoreBackupReason): string {
  const reasonKeys: Readonly<Record<SqliteRestoreBackupReason, MessageKey>> = {
    'pre-migration': 'settings.restore.reason.preMigration',
    protected: 'settings.restore.reason.protected',
    automatic: 'settings.restore.reason.automatic',
    manual: 'settings.restore.reason.manual'
  }
  return t(reasonKeys[reason])
}

function restoreErrorMessage(code: SqliteRestoreErrorCode): string {
  const errorKeys: Readonly<Record<SqliteRestoreErrorCode, MessageKey>> = {
    'invalid-backup': 'settings.restore.invalidError',
    'incompatible-backup': 'settings.restore.incompatibleError',
    'backup-changed': 'settings.restore.changedError',
    'selection-required': 'settings.restore.selectionRequiredError',
    'restore-in-progress': 'settings.restore.inProgressError',
    'recovery-required': 'settings.restore.recoveryRequiredError',
    'restore-failed': 'settings.restore.genericError'
  }
  return t(errorKeys[code])
}

function changeLanguage(value: ApplicationLanguage): void {
  if (value === language.value || preferenceState.value === 'saving') return
  void selectLanguage(value)
}

async function exportSqliteBackup(): Promise<void> {
  if (backupExporting.value) return

  backupExporting.value = true
  backupExportResult.value = null

  try {
    backupExportResult.value = await window.api.storage.exportSqliteBackup()
  } catch {
    backupExportResult.value = { status: 'error', code: 'export-failed' }
  } finally {
    backupExporting.value = false
  }
}

async function selectSqliteBackupForRestore(): Promise<void> {
  if (backupRestoreBusy.value) return

  backupRestoreSelecting.value = true
  backupRestoreSelection.value = null
  backupRestoreAction.value = null

  try {
    backupRestoreSelection.value = await window.api.storage.selectSqliteBackupForRestore()
  } catch {
    backupRestoreSelection.value = { status: 'error', code: 'invalid-backup' }
  } finally {
    backupRestoreSelecting.value = false
  }
}

async function confirmSqliteBackupRestore(): Promise<void> {
  if (backupRestoreBusy.value || backupRestorePreview.value === null) return

  backupRestoring.value = true
  backupRestoreAction.value = null

  try {
    const result = await window.api.storage.confirmSqliteBackupRestore()
    backupRestoreAction.value = result
    backupRestoreSelection.value = null
    if (result.status === 'success') {
      void loadDiagnostics()
    }
  } catch {
    backupRestoreSelection.value = null
    backupRestoreAction.value = { status: 'error', code: 'restore-failed' }
  } finally {
    backupRestoring.value = false
  }
}

async function cancelSqliteBackupRestore(): Promise<void> {
  if (backupRestoreBusy.value) return

  try {
    const result = await window.api.storage.cancelSqliteBackupRestore()
    backupRestoreAction.value = result
    if (result.status === 'cancelled') {
      backupRestoreSelection.value = null
    }
  } catch {
    backupRestoreAction.value = { status: 'error', code: 'restore-failed' }
  }
}
</script>

<template>
  <div
    class="app-shell"
    :data-theme="activeTheme.id"
    :data-motif="activeTheme.visual.motif"
    :style="themeStyle"
  >
    <a class="skip-link" href="#main-content">{{ t('a11y.skipToContent') }}</a>

    <aside class="sidebar" :aria-label="t('a11y.primaryNavigation')">
      <button
        class="brand-lockup"
        :class="{ 'brand-lockup--active': activeSection === 'home' }"
        type="button"
        :aria-current="activeSection === 'home' ? 'page' : undefined"
        :aria-label="t('a11y.goHome')"
        :title="navigationLabel('home')"
        @click="navigateTo('home')"
      >
        <img :src="brandLogoHorizontal" alt="" class="brand-logo brand-logo--horizontal" />
        <img :src="brandSymbol" alt="" class="brand-logo brand-logo--symbol" />
      </button>

      <nav class="primary-navigation">
        <button
          v-for="section in visibleNavigationSections"
          :key="section.id"
          class="nav-item"
          :class="{ 'nav-item--active': activeSection === section.id }"
          type="button"
          :aria-current="activeSection === section.id ? 'page' : undefined"
          :title="navigationDescription(section.id)"
          @click="navigateTo(section.id)"
        >
          <AppIcon :name="section.id" />
          <span>{{ navigationLabel(section.id) }}</span>
        </button>
      </nav>

      <div class="sidebar-context">
        <span class="context-label">{{ t('sidebar.activeAtmosphere') }}</span>
        <div class="context-world">
          <span class="context-sigil" aria-hidden="true">
            <img v-if="activeTheme.isNeutral" :src="brandSymbol" alt="" />
            <img
              v-else-if="artworkUrl(activeTheme, 'emblem')"
              :src="artworkUrl(activeTheme, 'emblem')"
              alt=""
              @error="markArtworkUnavailable(activeTheme.id, 'emblem')"
            />
            <AppIcon v-else name="sparkles" />
          </span>
          <div>
            <strong>{{ themeText(activeTheme.id, 'name') }}</strong>
            <small>{{
              activeTheme.isNeutral
                ? t('common.noActiveWorld')
                : availabilityLabel(worldThemeAvailability(activeTheme.id))
            }}</small>
          </div>
        </div>
      </div>

      <div class="sidebar-footer">
        <span class="status-dot" aria-hidden="true"></span>
        {{ t('sidebar.localPortableOffline') }}
      </div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div>
          <span class="topbar-kicker">{{ navigationDescription(activeSection) }}</span>
          <h1>{{ navigationLabel(activeSection) }}</h1>
        </div>
        <div class="topbar-actions">
          <div class="topbar-world" :aria-label="t('a11y.activeVisualTheme')">
            <span>{{ themeText(activeTheme.id, 'name') }}</span>
            <strong>{{
              activeTheme.isNeutral
                ? t('common.baseIdentity')
                : availabilityLabel(worldThemeAvailability(activeTheme.id))
            }}</strong>
          </div>
          <button
            class="settings-button"
            :class="{ 'settings-button--active': activeSection === 'settings' }"
            type="button"
            :aria-label="
              activeSection === 'settings'
                ? t('navigation.settings.opened')
                : t('navigation.settings.open')
            "
            :aria-current="activeSection === 'settings' ? 'page' : undefined"
            :aria-pressed="activeSection === 'settings'"
            :title="
              activeSection === 'settings'
                ? t('navigation.settings.opened')
                : t('navigation.settings.open')
            "
            @click="navigateTo('settings')"
          >
            <AppIcon name="settings" />
          </button>
        </div>
      </header>

      <main id="main-content" ref="mainContent" class="main-content" tabindex="-1">
        <section
          v-if="activeSection === 'home'"
          class="page page--home"
          aria-labelledby="home-title"
        >
          <article class="hero-panel">
            <div class="hero-backdrop" aria-hidden="true">
              <img
                v-if="artworkUrl(activeTheme, 'hero')"
                :key="activeTheme.id"
                :src="artworkUrl(activeTheme, 'hero')"
                alt=""
                @error="markArtworkUnavailable(activeTheme.id, 'hero')"
              />
              <div v-else class="artwork-fallback artwork-fallback--hero">
                <AppIcon name="sparkles" />
              </div>
            </div>

            <div class="hero-content">
              <div class="preview-badge">
                <span aria-hidden="true"></span>
                {{
                  activeTheme.isNeutral
                    ? t('home.neutralBadge')
                    : availabilityLabel(worldThemeAvailability(activeTheme.id))
                }}
              </div>
              <p class="hero-overline">{{ themeText(activeTheme.id, 'category') }}</p>
              <h2 id="home-title">{{ themeText(activeTheme.id, 'tagline') }}</h2>
              <p class="hero-description">{{ themeText(activeTheme.id, 'description') }}</p>
              <div class="hero-actions">
                <button class="button button--primary" type="button" @click="navigateTo('worlds')">
                  <AppIcon name="compass" />
                  {{ t('home.explore') }}
                </button>
                <button
                  v-if="!activeTheme.isNeutral"
                  class="button button--quiet"
                  type="button"
                  @click="returnToNeutralTheme"
                >
                  <AppIcon name="home" />
                  {{ t('home.returnToFatebound') }}
                </button>
              </div>
            </div>

            <div class="hero-geometry" aria-hidden="true">
              <div class="scene-grid"></div>
              <div class="scene-orbit"></div>
            </div>
          </article>

          <div class="home-grid">
            <article class="journal-card panel">
              <div class="panel-heading">
                <div class="panel-icon"><AppIcon name="chronicles" /></div>
                <div>
                  <span class="eyebrow">{{ t('home.journal.eyebrow') }}</span>
                  <h3>{{ t('home.journal.title') }}</h3>
                </div>
              </div>
              <p>{{ t('home.journal.body') }}</p>
              <div class="honest-state">
                <span class="honest-state__line"></span>
                {{ t('home.journal.future') }}
              </div>
            </article>

            <article class="library-card panel">
              <div class="panel-heading">
                <div class="panel-icon"><AppIcon name="worlds" /></div>
                <div>
                  <span class="eyebrow">{{ t('home.library.eyebrow') }}</span>
                  <h3>{{ t('home.library.title') }}</h3>
                </div>
              </div>
              <p>{{ t('home.library.body') }}</p>
              <button class="text-action" type="button" @click="navigateTo('worlds')">
                {{ t('home.library.action') }}
                <span aria-hidden="true">→</span>
              </button>
            </article>
          </div>
        </section>

        <section
          v-else-if="activeSection === 'worlds'"
          class="page page--worlds"
          aria-labelledby="worlds-title"
        >
          <div class="page-intro">
            <div>
              <span class="eyebrow">{{ t('worlds.eyebrow') }}</span>
              <h2 id="worlds-title">{{ t('worlds.title') }}</h2>
            </div>
            <div class="world-catalog-actions">
              <p>{{ t('worlds.intro') }}</p>
              <button
                class="button button--secondary button--compact"
                type="button"
                :disabled="worldPackageCatalogLoading"
                @click="loadWorldPackageCatalog"
              >
                <AppIcon
                  name="refresh"
                  :class="{ 'icon--spinning': worldPackageCatalogLoading }"
                />
                {{
                  worldPackageCatalogLoading
                    ? t('worlds.catalog.refreshing')
                    : t('worlds.catalog.refresh')
                }}
              </button>
            </div>
          </div>

          <p v-if="worldPackageCatalogStatus" class="world-catalog-status" aria-live="polite">
            {{ worldPackageCatalogStatus }}
          </p>

          <div class="world-card-grid" :aria-label="t('a11y.futureWorlds')">
            <button
              v-for="theme in BUILTIN_WORLD_THEMES"
              :key="theme.id"
              class="world-card"
              :class="{
                'world-card--active': activeTheme.id === theme.id,
                'world-card--available': worldThemeAvailability(theme.id) === 'package-available'
              }"
              :style="{ '--card-accent': theme.visual.colors.primary }"
              type="button"
              :aria-pressed="activeTheme.id === theme.id"
              @click="selectTheme(theme.id)"
            >
              <span class="world-card__art" aria-hidden="true">
                <img
                  v-if="artworkUrl(theme, 'card')"
                  :src="artworkUrl(theme, 'card')"
                  alt=""
                  @error="markArtworkUnavailable(theme.id, 'card')"
                />
                <span v-else class="artwork-fallback">
                  <AppIcon name="sparkles" />
                </span>
                <img
                  v-if="artworkUrl(theme, 'emblem')"
                  class="world-card__emblem"
                  :src="artworkUrl(theme, 'emblem')"
                  alt=""
                  @error="markArtworkUnavailable(theme.id, 'emblem')"
                />
              </span>
              <span class="world-card__body">
                <small>{{ availabilityLabel(worldThemeAvailability(theme.id)) }}</small>
                <strong>{{ themeText(theme.id, 'name') }}</strong>
                <span>{{ themeText(theme.id, 'category') }}</span>
              </span>
              <span class="world-card__check" aria-hidden="true">✓</span>
            </button>
          </div>

          <article v-if="activeWorldTheme" class="world-detail panel">
            <div class="world-detail__visual" aria-hidden="true">
              <img
                v-if="artworkUrl(activeWorldTheme, 'emblem')"
                class="world-detail__emblem"
                :src="artworkUrl(activeWorldTheme, 'emblem')"
                alt=""
                @error="markArtworkUnavailable(activeWorldTheme.id, 'emblem')"
              />
              <div v-else class="artwork-fallback artwork-fallback--emblem">
                <AppIcon name="sparkles" />
              </div>
            </div>
            <div class="world-detail__content">
              <span class="preview-badge preview-badge--inline">
                {{ availabilityLabel(worldThemeAvailability(activeWorldTheme.id)) }}
              </span>
              <h3>{{ themeText(activeWorldTheme.id, 'tagline') }}</h3>
              <p>{{ themeText(activeWorldTheme.id, 'description') }}</p>
              <div class="world-detail__meta">
                <div>
                  <span>{{ t('worlds.atmosphere') }}</span>
                  <strong>{{ themeText(activeWorldTheme.id, 'atmosphere') }}</strong>
                </div>
                <div>
                  <span>{{ t('worlds.availability') }}</span>
                  <strong>{{ availabilityLabel(worldThemeAvailability(activeWorldTheme.id)) }}</strong>
                </div>
              </div>
              <p v-if="selectedThemePackages.length > 0" class="world-note">
                {{
                  t('worlds.packageAvailableNote', {
                    versions: packageVersions(selectedThemePackages)
                  })
                }}
              </p>
              <p v-else class="world-note">{{ t('worlds.note') }}</p>
            </div>
          </article>

          <article v-else class="world-detail-empty panel">
            <span class="panel-icon" aria-hidden="true"><AppIcon name="worlds" /></span>
            <div>
              <span class="eyebrow">{{ t('worlds.empty.eyebrow') }}</span>
              <h3>{{ t('worlds.empty.title') }}</h3>
              <p>{{ t('worlds.empty.body') }}</p>
            </div>
          </article>

          <section
            v-if="additionalWorldPackages.length > 0"
            class="additional-worlds"
            aria-labelledby="additional-worlds-title"
          >
            <div class="additional-worlds__heading">
              <span class="eyebrow">{{ t('worlds.catalog.additionalEyebrow') }}</span>
              <h3 id="additional-worlds-title">{{ t('worlds.catalog.additionalTitle') }}</h3>
              <p>{{ t('worlds.catalog.additionalIntro') }}</p>
            </div>
            <div class="world-card-grid">
              <article
                v-for="packageInfo in additionalWorldPackages"
                :key="`${packageInfo.worldId}@${packageInfo.worldVersion}`"
                class="world-card world-card--neutral"
                :style="{ '--card-accent': activeTheme.visual.colors.primary }"
              >
                <span class="world-card__art world-card__art--neutral" aria-hidden="true">
                  <span class="artwork-fallback"><AppIcon name="worlds" /></span>
                </span>
                <span class="world-card__body">
                  <small>{{ t('common.packageAvailable') }}</small>
                  <strong>{{ packageTitle(packageInfo) }}</strong>
                  <span>v{{ packageInfo.worldVersion }} · {{ packageLanguages(packageInfo) }}</span>
                </span>
              </article>
            </div>
          </section>

          <aside
            v-if="
              worldPackageCatalog?.status === 'ready' &&
              (worldPackageCatalog.issues.length > 0 || worldPackageCatalog.scanLimitReached)
            "
            class="world-catalog-issues panel"
            aria-labelledby="world-catalog-issues-title"
          >
            <div>
              <span class="eyebrow">{{ t('worlds.catalog.issuesEyebrow') }}</span>
              <h3 id="world-catalog-issues-title">{{ t('worlds.catalog.issuesTitle') }}</h3>
            </div>
            <ul>
              <li v-for="issue in worldPackageCatalog.issues" :key="catalogIssueFiles(issue)">
                <strong>{{ catalogIssueFiles(issue) }}</strong>
                <span>{{ catalogIssueMessage(issue) }}</span>
              </li>
            </ul>
            <p v-if="worldPackageCatalog.scanLimitReached">
              {{ t('worlds.catalog.scanLimited') }}
            </p>
          </aside>

        </section>

        <section
          v-else-if="activeSection === 'characters'"
          class="page page--empty"
          aria-labelledby="characters-title"
        >
          <div class="empty-illustration" aria-hidden="true">
            <AppIcon name="characters" />
            <span></span>
          </div>
          <span class="eyebrow">{{ t('characters.eyebrow') }}</span>
          <h2 id="characters-title">{{ t('characters.title') }}</h2>
          <p>{{ t('characters.body') }}</p>
          <div class="future-card">
            <AppIcon name="shield" />
            <div>
              <strong>{{ t('characters.future.title') }}</strong>
              <span>{{ t('characters.future.body') }}</span>
            </div>
          </div>
        </section>

        <section
          v-else-if="activeSection === 'chronicles'"
          class="page page--empty"
          aria-labelledby="chronicles-title"
        >
          <div class="empty-illustration empty-illustration--book" aria-hidden="true">
            <AppIcon name="chronicles" />
            <span></span>
          </div>
          <span class="eyebrow">{{ t('chronicles.eyebrow') }}</span>
          <h2 id="chronicles-title">{{ t('chronicles.title') }}</h2>
          <p>{{ t('chronicles.body') }}</p>
          <div class="future-card">
            <AppIcon name="compass" />
            <div>
              <strong>{{ t('chronicles.future.title') }}</strong>
              <span>{{ t('chronicles.future.body') }}</span>
            </div>
          </div>
        </section>

        <section v-else class="page page--settings" aria-labelledby="settings-title">
          <div class="page-intro">
            <div>
              <span class="eyebrow">{{ t('settings.eyebrow') }}</span>
              <h2 id="settings-title">{{ t('settings.title') }}</h2>
            </div>
            <p>{{ t('settings.intro') }}</p>
          </div>

          <article class="language-panel panel" aria-labelledby="language-title">
            <div class="language-panel__copy">
              <span class="eyebrow">{{ t('settings.language.eyebrow') }}</span>
              <h3 id="language-title">{{ t('settings.language.title') }}</h3>
              <p>{{ t('settings.language.body') }}</p>
            </div>
            <div
              class="language-options"
              role="radiogroup"
              :aria-label="t('settings.language.groupLabel')"
            >
              <button
                v-for="option in availableLanguages"
                :key="option"
                class="language-option"
                :class="{ 'language-option--active': language === option }"
                type="button"
                role="radio"
                :aria-checked="language === option"
                :disabled="preferenceState === 'saving'"
                @click="changeLanguage(option)"
              >
                {{ languageName(option) }}
              </button>
            </div>
            <p
              v-if="languageStatusKey"
              class="language-status"
              :class="{
                'language-status--error':
                  preferenceState === 'load-error' ||
                  preferenceState === 'save-error' ||
                  preferenceState === 'invalid'
              }"
              aria-live="polite"
            >
              {{ t(languageStatusKey) }}
            </p>
          </article>

          <article class="backup-export-panel panel" aria-labelledby="backup-export-title">
            <div class="backup-export-panel__copy">
              <span class="eyebrow">{{ t('settings.export.eyebrow') }}</span>
              <h3 id="backup-export-title">{{ t('settings.export.title') }}</h3>
              <p>{{ t('settings.export.body') }}</p>
            </div>
            <button
              class="button button--primary"
              type="button"
              :disabled="backupExporting"
              @click="exportSqliteBackup"
            >
              <AppIcon name="database" />
              {{ backupExporting ? t('settings.export.working') : t('settings.export.action') }}
            </button>
            <p
              v-if="backupExportMessage"
              class="backup-export-status"
              :class="{ 'backup-export-status--error': backupExportFailed }"
              aria-live="polite"
            >
              {{ backupExportMessage }}
            </p>
          </article>

          <article class="backup-restore-panel panel" aria-labelledby="backup-restore-title">
            <div class="backup-restore-panel__copy">
              <span class="eyebrow">{{ t('settings.restore.eyebrow') }}</span>
              <h3 id="backup-restore-title">{{ t('settings.restore.title') }}</h3>
              <p>{{ t('settings.restore.body') }}</p>
            </div>
            <button
              class="button button--secondary"
              type="button"
              :disabled="backupRestoreBusy"
              @click="selectSqliteBackupForRestore"
            >
              <AppIcon name="database" />
              {{
                backupRestoreSelecting
                  ? t('settings.restore.selecting')
                  : t('settings.restore.action')
              }}
            </button>

            <div v-if="backupRestorePreview" class="backup-restore-preview">
              <dl>
                <div>
                  <dt>{{ t('settings.restore.previewDate') }}</dt>
                  <dd>{{ formatCheckedAt(backupRestorePreview.createdAt) }}</dd>
                </div>
                <div>
                  <dt>{{ t('settings.restore.previewType') }}</dt>
                  <dd>{{ formatBackupReason(backupRestorePreview.reason) }}</dd>
                </div>
                <div>
                  <dt>{{ t('settings.restore.previewSchema') }}</dt>
                  <dd>{{ backupRestorePreview.schemaVersion }}</dd>
                </div>
                <div>
                  <dt>{{ t('settings.restore.previewSize') }}</dt>
                  <dd>{{ formatFileSize(backupRestorePreview.sizeBytes) }}</dd>
                </div>
              </dl>
              <p class="backup-restore-warning" role="alert">
                <AppIcon name="shield" />
                <span>{{ t('settings.restore.warning') }}</span>
              </p>
              <div class="backup-restore-actions">
                <button
                  class="button button--secondary"
                  type="button"
                  :disabled="backupRestoreBusy"
                  @click="cancelSqliteBackupRestore"
                >
                  {{ t('settings.restore.cancelAction') }}
                </button>
                <button
                  class="button button--danger"
                  type="button"
                  :disabled="backupRestoreBusy"
                  @click="confirmSqliteBackupRestore"
                >
                  {{
                    backupRestoring
                      ? t('settings.restore.working')
                      : t('settings.restore.confirmAction')
                  }}
                </button>
              </div>
            </div>

            <p
              v-if="backupRestoreMessage"
              class="backup-restore-status"
              :class="{ 'backup-restore-status--error': backupRestoreFailed }"
              aria-live="polite"
            >
              {{ backupRestoreMessage }}
            </p>
          </article>

          <article class="diagnostics-panel panel" aria-labelledby="diagnostics-title">
            <div class="diagnostics-heading">
              <div>
                <div class="panel-icon"><AppIcon name="database" /></div>
                <div>
                  <span class="eyebrow">{{ t('settings.diagnostics.readOnly') }}</span>
                  <h3 id="diagnostics-title">{{ t('settings.diagnostics.title') }}</h3>
                </div>
              </div>
              <button
                class="button button--secondary button--compact"
                type="button"
                :disabled="diagnosticsLoading"
                @click="loadDiagnostics"
              >
                <AppIcon name="refresh" :class="{ 'icon--spinning': diagnosticsLoading }" />
                {{
                  diagnosticsLoading
                    ? t('settings.diagnostics.checking')
                    : t('settings.diagnostics.refresh')
                }}
              </button>
            </div>

            <div class="diagnostics-live" aria-live="polite">
              <div v-if="diagnosticsLoading && diagnostics === null" class="diagnostics-loading">
                <span></span>
                <div>
                  <strong>{{ t('settings.diagnostics.loadingTitle') }}</strong>
                  <p>{{ t('settings.diagnostics.loadingBody') }}</p>
                </div>
              </div>

              <div v-else-if="diagnostics?.status === 'error'" class="diagnostics-error">
                <AppIcon name="shield" />
                <div>
                  <strong>{{ t('settings.diagnostics.errorTitle') }}</strong>
                  <p>{{ t('settings.diagnostics.errorBody') }}</p>
                </div>
              </div>

              <template v-else-if="diagnostics?.status === 'ready'">
                <div class="health-banner">
                  <span class="health-icon"><AppIcon name="shield" /></span>
                  <div>
                    <strong>{{ t('settings.diagnostics.readyTitle') }}</strong>
                    <span>{{
                      t('settings.diagnostics.readyBody', {
                        date: formatCheckedAt(diagnostics.checkedAt)
                      })
                    }}</span>
                  </div>
                </div>

                <dl class="diagnostics-grid">
                  <div class="diagnostic-path diagnostic-path--wide">
                    <dt>{{ t('settings.diagnostics.dataLocation') }}</dt>
                    <dd>{{ diagnostics.dataDirectory }}</dd>
                  </div>
                  <div class="diagnostic-path diagnostic-path--wide">
                    <dt>{{ t('settings.diagnostics.database') }}</dt>
                    <dd>{{ diagnostics.databaseFile }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('settings.diagnostics.sqliteStatus') }}</dt>
                    <dd>
                      <span class="value-ok">{{ t('settings.diagnostics.available') }}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('settings.diagnostics.schemaVersion') }}</dt>
                    <dd>{{ diagnostics.schemaVersion }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('settings.diagnostics.integrity') }}</dt>
                    <dd>
                      <span class="value-ok">{{ t('settings.diagnostics.correct') }}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('settings.diagnostics.backups') }}</dt>
                    <dd>{{ diagnostics.managedBackupCount }}</dd>
                  </div>
                </dl>
              </template>
            </div>
          </article>

          <aside class="settings-note">
            <AppIcon name="shield" />
            <p>{{ t('settings.securityNote') }}</p>
          </aside>
        </section>
      </main>
    </div>
  </div>
</template>
