import { BUILTIN_THEME_IDS, type BuiltinThemeId } from './builtin-theme-schema.ts'

export type AppSectionId = 'home' | 'worlds' | 'characters' | 'chronicles' | 'settings'

export interface NavigationSection {
  readonly id: AppSectionId
  readonly label: string
  readonly description: string
}

export interface InstalledWorldNavigationContext {
  readonly worldId: string
  readonly worldVersion: string
}

export const APP_SECTIONS: Readonly<Record<AppSectionId, NavigationSection>> = Object.freeze({
  home: { id: 'home', label: 'Inicio', description: 'Tu umbral de aventuras' },
  worlds: { id: 'worlds', label: 'Mundos', description: 'Atmósferas y bibliotecas' },
  characters: { id: 'characters', label: 'Personajes', description: 'Héroes de tus relatos' },
  chronicles: { id: 'chronicles', label: 'Crónicas', description: 'Historias en curso' },
  settings: { id: 'settings', label: 'Ajustes', description: 'Aplicación y almacenamiento' }
})

const SECTION_IDS = Object.freeze(Object.keys(APP_SECTIONS) as AppSectionId[])
const BASE_NAVIGATION_SECTIONS = Object.freeze([APP_SECTIONS.worlds])
const WORLD_NAVIGATION_SECTIONS = Object.freeze([
  APP_SECTIONS.worlds,
  APP_SECTIONS.characters,
  APP_SECTIONS.chronicles
])

export function getContextualNavigationSections(
  activeWorld: InstalledWorldNavigationContext | null
): readonly NavigationSection[] {
  return activeWorld === null ? BASE_NAVIGATION_SECTIONS : WORLD_NAVIGATION_SECTIONS
}

export const DEFAULT_BUILTIN_THEME_ID: BuiltinThemeId = 'fatebound'

export function resolveSectionId(value: unknown): AppSectionId {
  return SECTION_IDS.includes(value as AppSectionId) ? (value as AppSectionId) : 'home'
}

export function resolveBuiltinThemeId(value: unknown): BuiltinThemeId {
  return BUILTIN_THEME_IDS.includes(value as BuiltinThemeId)
    ? (value as BuiltinThemeId)
    : DEFAULT_BUILTIN_THEME_ID
}

export function resolveNavigationTarget(
  sectionId: unknown,
  activeThemeId: unknown
): Readonly<{ sectionId: AppSectionId; activeThemeId: BuiltinThemeId }> {
  return Object.freeze({
    sectionId: resolveSectionId(sectionId),
    activeThemeId: resolveBuiltinThemeId(activeThemeId)
  })
}
