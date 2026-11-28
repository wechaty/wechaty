/**
 * Browser-compatible unit tests for `createPuppetTransport` (web/WinterTC)
 * verifying `grpc` rejection and transport-wide `abort()` cancellation of
 * in-flight `fetch` requests.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createClient } from '@connectrpc/connect'
import { Puppet as PuppetServiceDef } from 'wechaty-grpc'

import { createPuppetTransport } from './transport.ts'

test('createPuppetTransport (web) rejects grpc protocol', () => {
  assert.throws(() => createPuppetTransport({ baseUrl: 'http://127.0.0.1:8788', protocol: 'grpc' }))
})

test('createPuppetTransport (web) abort() cancels in-flight requests', async () => {
  let capturedSignal: AbortSignal | undefined
  const mockFetch: typeof globalThis.fetch = (_input, init) => {
    capturedSignal = init?.signal ?? undefined
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(init.signal?.reason ?? new Error('aborted'))
      }, { once: true })
    })
  }

  const handle = createPuppetTransport({
    baseUrl: 'http://127.0.0.1:8788',
    protocol: 'connect',
    fetch: mockFetch,
  })
  const client = createClient(PuppetServiceDef, handle.transport)

  const pending = client.version({})
  assert.ok(capturedSignal)
  assert.equal(capturedSignal.aborted, false)

  handle.abort()
  assert.equal(capturedSignal.aborted, true)
  await assert.rejects(() => pending)
})
