/**
 * Unit tests for the web-platform `#payload-storage` with a scripted
 * `indexedDB`, which runs in every runtime and produces the outcomes a real
 * browser rarely does: failed and blocked deletions. `payload-store.test.ts`
 * covers it with the real IndexedDB in Chromium.
 */
import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { payloadStorage } from './payload-storage.ts'

type Outcome = 'success' | 'error' | 'throw' | 'blocked'

/** Replaces `globalThis.indexedDB` until the test ends; returns its state. */
function useIndexedDB (t: TestContext, outcomes: Record<string, Outcome> | undefined) {
  const deleted: string[] = []
  const blocked: (() => void)[] = []

  const value = outcomes && {
    databases: async () => [ {}, ...Object.keys(outcomes).map(name => ({ name })) ],
    deleteDatabase: (name: string) => {
      if (outcomes[name] === 'throw') {
        throw new Error(`cannot delete ${name}`)
      }
      const request = { error: new Error(`cannot delete ${name}`) } as {
        error: Error, onblocked?: () => void, onerror?: () => void, onsuccess?: () => void,
      }
      const succeed = () => {
        deleted.push(name)
        request.onsuccess?.()
      }
      queueMicrotask(() => {
        switch (outcomes[name]) {
          case 'error':
            return request.onerror?.()
          case 'blocked':
            blocked.push(succeed)
            return request.onblocked?.()
          default:
            return succeed()
        }
      })
      return request
    },
  }

  const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value })
  t.after(() => {
    if (original) {
      Object.defineProperty(globalThis, 'indexedDB', original)
    } else {
      Reflect.deleteProperty(globalThis, 'indexedDB')
    }
  })

  return { blocked, deleted }
}

const root     = payloadStorage.root('token', 'v2.1')
const database = (accountId: string) => 'flash-store:' + payloadStorage.storePath(root, accountId, 'contact-payload')

test('web payloadStorage names cannot collide', () => {
  assert.notEqual(
    payloadStorage.storePath(root, 'a/b', 'contact-payload'),
    payloadStorage.storePath(root, 'a', 'b/contact-payload'),
  )
  assert.ok(!payloadStorage.root('token/v2.1', 'v2.1').startsWith(root + '/'))
})

test('web payloadStorage remove() deletes exactly the databases under its root', async t => {
  // v2.10 starts with v2.1, and token-2 with token.
  const others = [
    'flash-store:' + payloadStorage.storePath(payloadStorage.root('token', 'v2.10'), 'a', 'contact-payload'),
    'flash-store:' + payloadStorage.storePath(payloadStorage.root('token-2', 'v2.1'), 'a', 'contact-payload'),
    payloadStorage.storePath(root, 'a', 'contact-payload'),
    'unrelated',
  ]
  const { deleted } = useIndexedDB(t, Object.fromEntries(
    [ database('a'), database('b'), ...others ].map(name => [ name, 'success' as const ]),
  ))

  await payloadStorage.remove(root)
  assert.deepEqual(deleted.sort(), [ database('a'), database('b') ])
})

test('web payloadStorage remove() reports failures after deleting the rest', async t => {
  const { deleted } = useIndexedDB(t, {
    [database('a')]: 'error',
    [database('b')]: 'throw',
    [database('c')]: 'success',
  })

  await assert.rejects(payloadStorage.remove(root), (e: AggregateError) => {
    assert.match(e.message, /2 of 3/)
    assert.deepEqual(e.errors.map((each: Error) => each.message), [
      `cannot delete ${database('a')}`,
      `cannot delete ${database('b')}`,
    ])
    return true
  })
  assert.deepEqual(deleted, [ database('c') ])
})

test('web payloadStorage remove() waits while another connection blocks it', async t => {
  const { blocked } = useIndexedDB(t, { [database('a')]: 'blocked' })

  let done = false
  const removed = payloadStorage.remove(root).then(() => { done = true })
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(done, false, 'should not report a deletion that has not happened')

  blocked[0]!()
  await removed
  assert.equal(done, true, 'should resolve once the other connection closed')
})

test('web payloadStorage remove() rejects without IndexedDB', async t => {
  useIndexedDB(t, undefined)
  await assert.rejects(payloadStorage.remove(root), /IndexedDB is not available/)
})
