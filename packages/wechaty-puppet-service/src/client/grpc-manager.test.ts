/**
 * Smoke test for `GrpcManager`: the constructor requires an SNI prefix in
 * the token (`<sni>_<token>`).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WechatyToken } from 'wechaty-token'

import { GrpcManager } from './grpc-manager.ts'

/**
 * Huan(202108):
 *  the Server Name Identifier (SNI) in the token
 *    is required by the gRPC client.
 */
test('GrpcManager smoke testing', async _t => {
  assert.throws(() => new GrpcManager({
    token: 'UUIDv4',
  }), 'should throw if there is no SNI prefix in token')

  assert.doesNotThrow(() => new GrpcManager({
    token: 'SNI_UUIDv4',
  }), 'should not throw if there is SNI prefix in token')
})

test('GrpcManager wechaty:// token discovery failure throws immediately', async t => {
  const token = 'insecure_00000000-0000-0000-0000-000000000000'
  const manager = new GrpcManager({
    endpoint: `wechaty://discovery.example.com/${token}`,
    token,
    tls: { disable: true },
  })

  t.mock.method(WechatyToken.prototype, 'discover', async () => undefined)

  await assert.rejects(
    async () => (manager as any).initClient(),
    /Token discovery failed: invalid or unknown address/,
    'should reject when discovery returns undefined',
  )
})

test('GrpcManager wechaty:// token discovery error throws immediately', async t => {
  const token = 'insecure_00000000-0000-0000-0000-000000000000'
  const manager = new GrpcManager({
    endpoint: `wechaty://discovery.example.com/${token}`,
    token,
    tls: { disable: true },
  })

  t.mock.method(WechatyToken.prototype, 'discover', async () => {
    throw new Error('network down')
  })

  await assert.rejects(
    async () => (manager as any).initClient(),
    /Token discovery failed for wechaty:.*network down/,
    'should reject when discovery throws',
  )
})

test('GrpcManager wechaty:// token discovery success connects to discovered host and port', async t => {
  const token = 'insecure_00000000-0000-0000-0000-000000000000'
  const manager = new GrpcManager({
    endpoint: `wechaty://discovery.example.com/${token}`,
    token,
    tls: { disable: true },
  })

  t.mock.method(WechatyToken.prototype, 'discover', async () => ({
    host: '192.168.1.100',
    port: 9999,
  }))

  await (manager as any).initClient()
  assert.ok(manager.client, 'client should be created')
  ;(manager as any).destroyClient()
})

test('GrpcManager does not allocate a client when discovery completes after stop', async t => {
  const token = 'insecure_00000000-0000-0000-0000-000000000000'
  const discovered = Promise.withResolvers<{ host: string, port: number }>()
  const discovering = Promise.withResolvers<void>()
  t.mock.method(WechatyToken.prototype, 'discover', async () => {
    discovering.resolve()
    return discovered.promise
  })

  class DiscoveryManager extends GrpcManager {
    /** A cancelled discovery must never open a stream. */
    protected override async startStream (): Promise<void> {
      assert.fail('cancelled discovery must not start a stream')
    }
  }

  const manager = new DiscoveryManager({
    endpoint: `wechaty://discovery.example.com/${token}`,
    token,
    tls: { disable: true },
  })
  const controller = new AbortController()
  const reason = new Error('Puppet stopped during discovery')
  const starting = assert.rejects(manager.start({ signal: controller.signal }), error => error === reason)
  await discovering.promise
  controller.abort(reason)
  await manager.stop()
  // Discovery cancellation must reject start() immediately without waiting for discover() to settle.
  await starting
  discovered.resolve({ host: '192.0.2.1', port: 9999 })
  await Promise.resolve()
  assert.throws(() => manager.client, /NO CLIENT/)
})
