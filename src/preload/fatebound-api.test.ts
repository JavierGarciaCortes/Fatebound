import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STORAGE_DIAGNOSTICS_CHANNEL } from '../shared/storage-diagnostics.ts'
import {
  GET_APPLICATION_LANGUAGE_CHANNEL,
  SET_APPLICATION_LANGUAGE_CHANNEL
} from '../shared/application-language.ts'
import { createFateboundApi } from './fatebound-api.ts'

test('the preload API exposes only restricted diagnostics and language operations', async () => {
  const invocations: Array<{ channel: string; args: readonly unknown[] }> = []
  const expectedResult = {
    status: 'error' as const,
    code: 'diagnostics-unavailable' as const
  }
  const api = createFateboundApi(async (channel, ...args) => {
    invocations.push({ channel, args })
    if (channel === GET_APPLICATION_LANGUAGE_CHANNEL) {
      return { status: 'ready', language: 'es', source: 'stored' }
    }
    if (channel === SET_APPLICATION_LANGUAGE_CHANNEL) {
      return { status: 'saved', language: args[0] }
    }
    return expectedResult
  })

  assert.deepEqual(Object.keys(api), ['storage', 'preferences'])
  assert.deepEqual(Object.keys(api.storage), ['getDiagnostics'])
  assert.deepEqual(Object.keys(api.preferences), ['getLanguage', 'setLanguage'])
  assert.equal(await api.storage.getDiagnostics(), expectedResult)
  assert.deepEqual(await api.preferences.getLanguage(), {
    status: 'ready',
    language: 'es',
    source: 'stored'
  })
  assert.deepEqual(await api.preferences.setLanguage('ko'), { status: 'saved', language: 'ko' })
  assert.deepEqual(invocations, [
    { channel: STORAGE_DIAGNOSTICS_CHANNEL, args: [] },
    { channel: GET_APPLICATION_LANGUAGE_CHANNEL, args: [] },
    { channel: SET_APPLICATION_LANGUAGE_CHANNEL, args: ['ko'] }
  ])
})
