import assert from 'node:assert/strict'
import { test } from 'node:test'
import { acquireSingleInstanceLock } from './single-instance.ts'

test('continues without quitting when the single-instance lock is acquired', () => {
  let quitCalls = 0

  const acquired = acquireSingleInstanceLock({
    requestSingleInstanceLock: () => true,
    quit() {
      quitCalls += 1
    }
  })

  assert.equal(acquired, true)
  assert.equal(quitCalls, 0)
})

test('quits before startup when another instance owns the lock', () => {
  let quitCalls = 0

  const acquired = acquireSingleInstanceLock({
    requestSingleInstanceLock: () => false,
    quit() {
      quitCalls += 1
    }
  })

  assert.equal(acquired, false)
  assert.equal(quitCalls, 1)
})
