<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type {
  StorageDiagnosticsFailure,
  StorageDiagnosticsResult
} from '../../shared/storage-diagnostics'
import brandLogoHorizontal from '../../../resources/branding/fatebound/fatebound-logo-horizontal.png'
import brandSymbol from '../../../resources/branding/fatebound/fatebound-symbol.png'
import AppIcon from './components/AppIcon.vue'
import {
  APP_SECTIONS,
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

const activeSection = ref<AppSectionId>('home')
const activeThemeId = ref<BuiltinThemeId>(DEFAULT_BUILTIN_THEME_ID)
const activeInstalledWorld = ref<InstalledWorldNavigationContext | null>(null)
const mainContent = ref<HTMLElement | null>(null)
const diagnostics = ref<StorageDiagnosticsResult | null>(null)
const diagnosticsLoading = ref(false)
const failedArtwork = ref<readonly string[]>([])

const activeTheme = computed(() => resolveBuiltinTheme(activeThemeId.value))
const activeWorldTheme = computed(() =>
  activeTheme.value.role === 'future-world' ? activeTheme.value : null
)
const activeSectionDetails = computed(() => APP_SECTIONS[activeSection.value])
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

  await nextTick()
  mainContent.value?.scrollTo({ top: 0, left: 0 })
  mainContent.value?.focus()
}

async function loadDiagnostics(): Promise<void> {
  if (diagnosticsLoading.value) return

  diagnosticsLoading.value = true

  try {
    diagnostics.value = await window.api.storage.getDiagnostics()
  } catch {
    const failure: StorageDiagnosticsFailure = {
      status: 'error',
      code: 'diagnostics-unavailable',
      message:
        'No se pudo solicitar el diagnóstico al proceso principal. Fatebound no mostrará datos estimados.'
    }
    diagnostics.value = failure
  } finally {
    diagnosticsLoading.value = false
  }
}

function formatCheckedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}
</script>

<template>
  <div
    class="app-shell"
    :data-theme="activeTheme.id"
    :data-motif="activeTheme.visual.motif"
    :style="themeStyle"
  >
    <a class="skip-link" href="#main-content">Saltar al contenido</a>

    <aside class="sidebar" aria-label="Navegación principal">
      <button
        class="brand-lockup"
        :class="{ 'brand-lockup--active': activeSection === 'home' }"
        type="button"
        :aria-current="activeSection === 'home' ? 'page' : undefined"
        aria-label="Fatebound: ir a Inicio"
        title="Ir a Inicio"
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
          :title="section.description"
          @click="navigateTo(section.id)"
        >
          <AppIcon :name="section.id" />
          <span>{{ section.label }}</span>
        </button>
      </nav>

      <div class="sidebar-context">
        <span class="context-label">Atmósfera activa</span>
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
            <strong>{{ activeTheme.displayName }}</strong>
            <small>{{ activeTheme.isNeutral ? 'Sin mundo activo' : 'Próximamente' }}</small>
          </div>
        </div>
      </div>

      <div class="sidebar-footer">
        <span class="status-dot" aria-hidden="true"></span>
        Local · Portable · Sin conexión
      </div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div>
          <span class="topbar-kicker">{{ activeSectionDetails.description }}</span>
          <h1>{{ activeSectionDetails.label }}</h1>
        </div>
        <div class="topbar-actions">
          <div class="topbar-world" aria-label="Tema visual activo">
            <span>{{ activeTheme.displayName }}</span>
            <strong>{{ activeTheme.isNeutral ? 'Identidad base' : 'Próximamente' }}</strong>
          </div>
          <button
            class="settings-button"
            :class="{ 'settings-button--active': activeSection === 'settings' }"
            type="button"
            :aria-label="activeSection === 'settings' ? 'Ajustes abiertos' : 'Abrir Ajustes'"
            :aria-current="activeSection === 'settings' ? 'page' : undefined"
            :aria-pressed="activeSection === 'settings'"
            :title="activeSection === 'settings' ? 'Ajustes abiertos' : 'Abrir Ajustes'"
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
                    ? 'Fatebound · Sin mundo activo'
                    : 'Mundo futuro · Próximamente'
                }}
              </div>
              <p class="hero-overline">{{ activeTheme.presentation.category }}</p>
              <h2 id="home-title">{{ activeTheme.tagline }}</h2>
              <p class="hero-description">{{ activeTheme.presentation.description }}</p>
              <div class="hero-actions">
                <button class="button button--primary" type="button" @click="navigateTo('worlds')">
                  <AppIcon name="compass" />
                  Explorar atmósferas
                </button>
                <button
                  v-if="!activeTheme.isNeutral"
                  class="button button--quiet"
                  type="button"
                  @click="returnToNeutralTheme"
                >
                  <AppIcon name="home" />
                  Volver a Fatebound
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
                  <span class="eyebrow">Tu diario de aventuras</span>
                  <h3>La próxima crónica empieza aquí</h3>
                </div>
              </div>
              <p>
                Cuando existan crónicas, este espacio reunirá decisiones, escenas y consecuencias.
                Aún no hay historias jugables ni datos de ejemplo guardados.
              </p>
              <div class="honest-state">
                <span class="honest-state__line"></span>
                Función prevista para una fase posterior
              </div>
            </article>

            <article class="library-card panel">
              <div class="panel-heading">
                <div class="panel-icon"><AppIcon name="worlds" /></div>
                <div>
                  <span class="eyebrow">Biblioteca local</span>
                  <h3>Ningún mundo instalado</h3>
                </div>
              </div>
              <p>
                Ocho mundos futuros permiten explorar su atmósfera visual. Todavía no contienen
                paquetes, reglas, personajes ni contenido jugable.
              </p>
              <button class="text-action" type="button" @click="navigateTo('worlds')">
                Ver los ocho mundos
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
              <span class="eyebrow">Biblioteca visual</span>
              <h2 id="worlds-title">Elige el tono de tu aventura</h2>
            </div>
            <p>
              Ocho mundos futuros, seleccionables para explorar su ambientación. Ninguno contiene
              todavía reglas ni contenido jugable.
            </p>
          </div>

          <div class="world-card-grid" aria-label="Mundos futuros disponibles">
            <button
              v-for="theme in BUILTIN_WORLD_THEMES"
              :key="theme.id"
              class="world-card"
              :class="{ 'world-card--active': activeTheme.id === theme.id }"
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
                <small>Próximamente</small>
                <strong>{{ theme.displayName }}</strong>
                <span>{{ theme.presentation.category }}</span>
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
              <span class="preview-badge preview-badge--inline">Próximamente</span>
              <h3>{{ activeWorldTheme.tagline }}</h3>
              <p>{{ activeWorldTheme.presentation.description }}</p>
              <div class="world-detail__meta">
                <div>
                  <span>Atmósfera</span>
                  <strong>{{ activeWorldTheme.presentation.atmosphere }}</strong>
                </div>
                <div>
                  <span>Disponibilidad</span>
                  <strong>Próximamente</strong>
                </div>
              </div>
              <p class="world-note">
                Este mundo aún no contiene reglas ni contenido jugable. Por ahora, seleccionarlo
                solo activa su ambientación visual durante la sesión.
              </p>
            </div>
          </article>

          <article v-else class="world-detail-empty panel">
            <span class="panel-icon" aria-hidden="true"><AppIcon name="worlds" /></span>
            <div>
              <span class="eyebrow">Sin mundo seleccionado</span>
              <h3>Explora una atmósfera futura</h3>
              <p>
                Fatebound permanece como identidad base. Selecciona una tarjeta para ver el tono y
                el emblema del mundo sin activar contenido jugable.
              </p>
            </div>
          </article>
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
          <span class="eyebrow">Archivo de protagonistas</span>
          <h2 id="characters-title">Tus personajes aún no han llegado</h2>
          <p>
            La creación y gestión de personajes se implementará cuando exista el esquema del juego.
            Esta pantalla no guarda datos ni ofrece acciones simuladas.
          </p>
          <div class="future-card">
            <AppIcon name="shield" />
            <div>
              <strong>Preparado para el futuro</strong>
              <span>Cada personaje quedará vinculado a una versión exacta de su mundo.</span>
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
          <span class="eyebrow">Crónicas</span>
          <h2 id="chronicles-title">No hay historias en curso</h2>
          <p>
            Las crónicas y sus escenas todavía no están implementadas. Cuando lo estén, este será el
            lugar para retomarlas sin perder su mundo ni su versión.
          </p>
          <div class="future-card">
            <AppIcon name="compass" />
            <div>
              <strong>Sin contenido ficticio</strong>
              <span>Fatebound no creará crónicas de muestra en tu base de datos.</span>
            </div>
          </div>
        </section>

        <section v-else class="page page--settings" aria-labelledby="settings-title">
          <div class="page-intro">
            <div>
              <span class="eyebrow">Sistema local</span>
              <h2 id="settings-title">Ajustes y diagnóstico</h2>
            </div>
            <p>
              La información se consulta de forma puntual en el proceso principal. Esta pantalla no
              puede escribir en SQLite ni explorar otros archivos.
            </p>
          </div>

          <article class="diagnostics-panel panel" aria-labelledby="diagnostics-title">
            <div class="diagnostics-heading">
              <div>
                <div class="panel-icon"><AppIcon name="database" /></div>
                <div>
                  <span class="eyebrow">Solo lectura</span>
                  <h3 id="diagnostics-title">Almacenamiento SQLite</h3>
                </div>
              </div>
              <button
                class="button button--secondary button--compact"
                type="button"
                :disabled="diagnosticsLoading"
                @click="loadDiagnostics"
              >
                <AppIcon name="refresh" :class="{ 'icon--spinning': diagnosticsLoading }" />
                {{ diagnosticsLoading ? 'Comprobando…' : 'Actualizar' }}
              </button>
            </div>

            <div class="diagnostics-live" aria-live="polite">
              <div v-if="diagnosticsLoading && diagnostics === null" class="diagnostics-loading">
                <span></span>
                <div>
                  <strong>Consultando el almacenamiento</strong>
                  <p>La comprobación se ejecuta una sola vez y no modifica la base.</p>
                </div>
              </div>

              <div v-else-if="diagnostics?.status === 'error'" class="diagnostics-error">
                <AppIcon name="shield" />
                <div>
                  <strong>Diagnóstico no disponible</strong>
                  <p>{{ diagnostics.message }}</p>
                </div>
              </div>

              <template v-else-if="diagnostics?.status === 'ready'">
                <div class="health-banner">
                  <span class="health-icon"><AppIcon name="shield" /></span>
                  <div>
                    <strong>SQLite disponible y comprobado</strong>
                    <span>
                      Integridad y claves foráneas correctas ·
                      {{ formatCheckedAt(diagnostics.checkedAt) }}
                    </span>
                  </div>
                </div>

                <dl class="diagnostics-grid">
                  <div class="diagnostic-path diagnostic-path--wide">
                    <dt>Ubicación de datos</dt>
                    <dd>{{ diagnostics.dataDirectory }}</dd>
                  </div>
                  <div class="diagnostic-path diagnostic-path--wide">
                    <dt>Base de datos</dt>
                    <dd>{{ diagnostics.databaseFile }}</dd>
                  </div>
                  <div>
                    <dt>Estado SQLite</dt>
                    <dd><span class="value-ok">Disponible</span></dd>
                  </div>
                  <div>
                    <dt>Versión de esquema</dt>
                    <dd>{{ diagnostics.schemaVersion }}</dd>
                  </div>
                  <div>
                    <dt>Integridad</dt>
                    <dd><span class="value-ok">Correcta</span></dd>
                  </div>
                  <div>
                    <dt>Copias administradas válidas</dt>
                    <dd>{{ diagnostics.managedBackupCount }}</dd>
                  </div>
                </dl>
              </template>
            </div>
          </article>

          <aside class="settings-note">
            <AppIcon name="shield" />
            <p>
              El renderer recibe una instantánea limitada. No recibe la conexión SQLite, consultas
              SQL ni acceso general al sistema de archivos.
            </p>
          </aside>
        </section>
      </main>
    </div>
  </div>
</template>
