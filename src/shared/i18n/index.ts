import {
  DEFAULT_APPLICATION_LANGUAGE,
  isApplicationLanguage,
  type ApplicationLanguage
} from '../application-language.ts'
import { en } from './locales/en.ts'
import { es, type MessageKey, type TranslationMessages } from './locales/es.ts'
import { ko } from './locales/ko.ts'

export type TranslationParameters = Readonly<Record<string, string | number>>

export const TRANSLATIONS: Readonly<Record<ApplicationLanguage, TranslationMessages>> = Object.freeze({
  es,
  en,
  ko
})

export function resolveApplicationLanguage(value: unknown): ApplicationLanguage {
  return isApplicationLanguage(value) ? value : DEFAULT_APPLICATION_LANGUAGE
}

export function translate(
  language: ApplicationLanguage,
  key: MessageKey,
  parameters: TranslationParameters = {}
): string {
  const template = TRANSLATIONS[language]?.[key] ?? es[key]
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, name: string) =>
    Object.hasOwn(parameters, name) ? String(parameters[name]) : match
  )
}

export type { MessageKey }
