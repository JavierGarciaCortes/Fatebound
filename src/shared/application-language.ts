export const APPLICATION_LANGUAGES = ['es', 'en', 'ko'] as const

export type ApplicationLanguage = (typeof APPLICATION_LANGUAGES)[number]

export const DEFAULT_APPLICATION_LANGUAGE = 'es' as const satisfies ApplicationLanguage
export const GET_APPLICATION_LANGUAGE_CHANNEL = 'fatebound:preferences:get-language'
export const SET_APPLICATION_LANGUAGE_CHANNEL = 'fatebound:preferences:set-language'

export type ApplicationLanguageSource = 'stored' | 'default-missing' | 'default-invalid'

export type ApplicationLanguageReadResult =
  | {
      readonly status: 'ready'
      readonly language: ApplicationLanguage
      readonly source: ApplicationLanguageSource
    }
  | {
      readonly status: 'error'
      readonly language: typeof DEFAULT_APPLICATION_LANGUAGE
      readonly code: 'preferences-unavailable'
    }

export type ApplicationLanguageWriteResult =
  | { readonly status: 'saved'; readonly language: ApplicationLanguage }
  | {
      readonly status: 'error'
      readonly code: 'invalid-language' | 'preferences-not-saved'
    }

export function isApplicationLanguage(value: unknown): value is ApplicationLanguage {
  return (
    typeof value === 'string' &&
    APPLICATION_LANGUAGES.includes(value as ApplicationLanguage)
  )
}
