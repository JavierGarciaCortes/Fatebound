import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  GET_APPLICATION_LANGUAGE_CHANNEL,
  SET_APPLICATION_LANGUAGE_CHANNEL
} from '../../shared/application-language.ts'
import {
  readApplicationLanguageFromDirectory,
  writeApplicationLanguageToDirectory
} from './application-preferences.ts'
import {
  registerApplicationPreferencesIpc,
  type PreferencesIpcHandler
} from './application-preferences-ipc.ts'

test('persists and reopens a validated language with safe Spanish fallbacks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fatebound-preferences-'))

  try {
    assert.deepEqual(await readApplicationLanguageFromDirectory(directory), {
      status: 'ready',
      language: 'es',
      source: 'default-missing'
    })

    await writeApplicationLanguageToDirectory(directory, 'ko', () => 'test')
    assert.deepEqual(await readApplicationLanguageFromDirectory(directory), {
      status: 'ready',
      language: 'ko',
      source: 'stored'
    })

    const stored = JSON.parse(await readFile(join(directory, 'preferences.json'), 'utf8'))
    assert.deepEqual(stored, { schemaVersion: 1, applicationLanguage: 'ko' })

    await writeFile(join(directory, 'preferences.json'), '{"applicationLanguage":"xx"}', 'utf8')
    assert.deepEqual(await readApplicationLanguageFromDirectory(directory), {
      status: 'ready',
      language: 'es',
      source: 'default-invalid'
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('the preferences IPC rejects unsupported languages before writing', async () => {
  const handlers = new Map<string, PreferencesIpcHandler>()
  const written: string[] = []

  registerApplicationPreferencesIpc(
    (channel, handler) => handlers.set(channel, handler),
    {
      readLanguage: async () => ({ status: 'ready', language: 'en', source: 'stored' }),
      writeLanguage: async (language) => {
        written.push(language)
      }
    }
  )

  assert.deepEqual(await handlers.get(GET_APPLICATION_LANGUAGE_CHANNEL)!(), {
    status: 'ready',
    language: 'en',
    source: 'stored'
  })
  assert.deepEqual(await handlers.get(SET_APPLICATION_LANGUAGE_CHANNEL)!('fr'), {
    status: 'error',
    code: 'invalid-language'
  })
  assert.deepEqual(await handlers.get(SET_APPLICATION_LANGUAGE_CHANNEL)!('en'), {
    status: 'saved',
    language: 'en'
  })
  assert.deepEqual(written, ['en'])
})
