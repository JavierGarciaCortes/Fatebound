import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_APPLICATION_LANGUAGE } from '../application-language.ts'
import { TRANSLATIONS, resolveApplicationLanguage, translate } from './index.ts'

test('all locales expose the same translation keys and invalid locales fall back to Spanish', () => {
  const spanishKeys = Object.keys(TRANSLATIONS.es).sort()
  assert.deepEqual(Object.keys(TRANSLATIONS.en).sort(), spanishKeys)
  assert.deepEqual(Object.keys(TRANSLATIONS.ko).sort(), spanishKeys)
  assert.equal(resolveApplicationLanguage('invalid'), DEFAULT_APPLICATION_LANGUAGE)
  assert.equal(translate('en', 'common.upcoming'), 'Coming soon')
  assert.equal(translate('ko', 'settings.language.ko'), '한국어')
})
