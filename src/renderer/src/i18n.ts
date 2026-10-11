import { readonly, ref } from 'vue'
import {
  APPLICATION_LANGUAGES,
  DEFAULT_APPLICATION_LANGUAGE,
  type ApplicationLanguage,
  type ApplicationLanguageReadResult
} from '../../shared/application-language.ts'
import {
  translate,
  type MessageKey,
  type TranslationParameters
} from '../../shared/i18n/index.ts'

export type LanguagePreferenceState =
  | 'idle'
  | 'invalid'
  | 'load-error'
  | 'saving'
  | 'saved'
  | 'save-error'

const currentLanguage = ref<ApplicationLanguage>(DEFAULT_APPLICATION_LANGUAGE)
const preferenceState = ref<LanguagePreferenceState>('idle')

function applyDocumentLanguage(language: ApplicationLanguage): void {
  document.documentElement.lang = language
}

export function initializeI18n(result: ApplicationLanguageReadResult): void {
  currentLanguage.value = result.language
  preferenceState.value =
    result.status === 'error'
      ? 'load-error'
      : result.source === 'default-invalid'
        ? 'invalid'
        : 'idle'
  applyDocumentLanguage(result.language)
}

export async function selectApplicationLanguage(language: ApplicationLanguage): Promise<void> {
  currentLanguage.value = language
  preferenceState.value = 'saving'
  applyDocumentLanguage(language)

  try {
    const result = await window.api.preferences.setLanguage(language)
    preferenceState.value = result.status === 'saved' ? 'saved' : 'save-error'
  } catch {
    preferenceState.value = 'save-error'
  }
}

const i18nApi = {
  language: readonly(currentLanguage),
  preferenceState: readonly(preferenceState),
  availableLanguages: APPLICATION_LANGUAGES,
  t: (key: MessageKey, parameters?: TranslationParameters) =>
    translate(currentLanguage.value, key, parameters),
  selectLanguage: selectApplicationLanguage
}

export function useI18n(): typeof i18nApi {
  return i18nApi
}
