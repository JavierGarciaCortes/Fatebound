import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STORAGE_DIAGNOSTICS_CHANNEL } from '../shared/storage-diagnostics.ts'
import {
  GET_APPLICATION_LANGUAGE_CHANNEL,
  SET_APPLICATION_LANGUAGE_CHANNEL
} from '../shared/application-language.ts'
import { createFateboundApi } from './fatebound-api.ts'
import { SQLITE_MANUAL_EXPORT_CHANNEL } from '../shared/sqlite-manual-export.ts'
import {
  SQLITE_RESTORE_CANCEL_CHANNEL,
  SQLITE_RESTORE_CONFIRM_CHANNEL,
  SQLITE_RESTORE_SELECT_CHANNEL
} from '../shared/sqlite-safe-restore.ts'

test('the preload API exposes only restricted storage and language operations', async () => {
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
    if (channel === SQLITE_MANUAL_EXPORT_CHANNEL) {
      return { status: 'success', backupDirectoryName: 'backup-safe' }
    }
    if (channel === SQLITE_RESTORE_SELECT_CHANNEL) {
      return {
        status: 'ready',
        backup: {
          createdAt: '2026-10-11T12:34:56.000Z',
          reason: 'manual',
          schemaVersion: 1,
          sizeBytes: 4096
        }
      }
    }
    if (channel === SQLITE_RESTORE_CONFIRM_CHANNEL) return { status: 'success' }
    if (channel === SQLITE_RESTORE_CANCEL_CHANNEL) return { status: 'cancelled' }
    return expectedResult
  })

  assert.deepEqual(Object.keys(api), ['storage', 'preferences'])
  assert.deepEqual(Object.keys(api.storage), [
    'getDiagnostics',
    'exportSqliteBackup',
    'selectSqliteBackupForRestore',
    'confirmSqliteBackupRestore',
    'cancelSqliteBackupRestore'
  ])
  assert.deepEqual(Object.keys(api.preferences), ['getLanguage', 'setLanguage'])
  assert.equal(await api.storage.getDiagnostics(), expectedResult)
  assert.deepEqual(await api.preferences.getLanguage(), {
    status: 'ready',
    language: 'es',
    source: 'stored'
  })
  assert.deepEqual(await api.preferences.setLanguage('ko'), { status: 'saved', language: 'ko' })
  assert.deepEqual(await api.storage.exportSqliteBackup(), {
    status: 'success',
    backupDirectoryName: 'backup-safe'
  })
  assert.equal((await api.storage.selectSqliteBackupForRestore()).status, 'ready')
  assert.deepEqual(await api.storage.confirmSqliteBackupRestore(), { status: 'success' })
  assert.deepEqual(await api.storage.cancelSqliteBackupRestore(), { status: 'cancelled' })
  assert.deepEqual(invocations, [
    { channel: STORAGE_DIAGNOSTICS_CHANNEL, args: [] },
    { channel: GET_APPLICATION_LANGUAGE_CHANNEL, args: [] },
    { channel: SET_APPLICATION_LANGUAGE_CHANNEL, args: ['ko'] },
    { channel: SQLITE_MANUAL_EXPORT_CHANNEL, args: [] },
    { channel: SQLITE_RESTORE_SELECT_CHANNEL, args: [] },
    { channel: SQLITE_RESTORE_CONFIRM_CHANNEL, args: [] },
    { channel: SQLITE_RESTORE_CANCEL_CHANNEL, args: [] }
  ])
})
