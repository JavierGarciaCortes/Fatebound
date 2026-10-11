import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STORAGE_DIAGNOSTICS_CHANNEL } from '../shared/storage-diagnostics.ts'
import { createFateboundApi } from './fatebound-api.ts'

test('the preload API exposes only the restricted storage diagnostics operation', async () => {
  const invokedChannels: string[] = []
  const expectedResult = {
    status: 'error' as const,
    code: 'diagnostics-unavailable' as const,
    message: 'not available'
  }
  const api = createFateboundApi(async (channel) => {
    invokedChannels.push(channel)
    return expectedResult
  })

  assert.deepEqual(Object.keys(api), ['storage'])
  assert.deepEqual(Object.keys(api.storage), ['getDiagnostics'])
  assert.equal(await api.storage.getDiagnostics(), expectedResult)
  assert.deepEqual(invokedChannels, [STORAGE_DIAGNOSTICS_CHANNEL])
})
