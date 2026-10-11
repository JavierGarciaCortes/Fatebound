import {
  GET_APPLICATION_LANGUAGE_CHANNEL,
  SET_APPLICATION_LANGUAGE_CHANNEL,
  isApplicationLanguage,
  type ApplicationLanguage,
  type ApplicationLanguageReadResult,
  type ApplicationLanguageWriteResult
} from '../../shared/application-language.ts'
import {
  readActiveApplicationLanguage,
  writeActiveApplicationLanguage
} from './application-preferences.ts'

export type PreferencesIpcHandler = (...args: readonly unknown[]) => Promise<unknown>
export type PreferencesIpcRegistrar = (channel: string, handler: PreferencesIpcHandler) => void

export interface ApplicationPreferencesIpcOptions {
  readonly readLanguage?: () => Promise<ApplicationLanguageReadResult>
  readonly writeLanguage?: (language: ApplicationLanguage) => Promise<void>
  readonly onLanguageSelected?: (language: ApplicationLanguage) => void
  readonly onError?: (error: unknown) => void
}

export function registerApplicationPreferencesIpc(
  registerHandler: PreferencesIpcRegistrar,
  options: ApplicationPreferencesIpcOptions = {}
): void {
  const readLanguage = options.readLanguage ?? readActiveApplicationLanguage
  const writeLanguage = options.writeLanguage ?? writeActiveApplicationLanguage
  const onLanguageSelected = options.onLanguageSelected ?? (() => undefined)
  const onError = options.onError ?? (() => undefined)

  registerHandler(
    GET_APPLICATION_LANGUAGE_CHANNEL,
    async (): Promise<ApplicationLanguageReadResult> => {
      try {
        return await readLanguage()
      } catch (error) {
        onError(error)
        return { status: 'error', language: 'es', code: 'preferences-unavailable' }
      }
    }
  )

  registerHandler(
    SET_APPLICATION_LANGUAGE_CHANNEL,
    async (value: unknown): Promise<ApplicationLanguageWriteResult> => {
      if (!isApplicationLanguage(value)) return { status: 'error', code: 'invalid-language' }
      onLanguageSelected(value)

      try {
        await writeLanguage(value)
        return { status: 'saved', language: value }
      } catch (error) {
        onError(error)
        return { status: 'error', code: 'preferences-not-saved' }
      }
    }
  )
}
