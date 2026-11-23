/**
 * Unit tests for `WechatyResolver` through grpc-js's public resolver API:
 * a successful discovery becomes one endpoint, a failed or empty discovery
 * becomes one `UNAVAILABLE` error, and the target's authority reaches
 * `WechatyToken`. Discovery is stubbed, so no network is used.
 */
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { experimental, status as GrpcStatus } from '@grpc/grpc-js'

import { WechatyToken } from './wechaty-token.ts'
import { WechatyResolver } from './resolver-wechaty.ts'

type Discover = WechatyToken['discover']
const originalDiscover = WechatyToken.prototype.discover

/** Replaces `WechatyToken.prototype.discover` until the test ends. */
function stubDiscover (fake: (this: WechatyToken) => ReturnType<Discover>): void {
  WechatyToken.prototype.discover = fake
}

afterEach(() => {
  WechatyToken.prototype.discover = originalDiscover
})

/** Resolves one target and returns the first result the listener receives. */
function resolveOnce (target: experimental.GrpcUri): Promise<experimental.StatusOr<experimental.Endpoint[]>> {
  WechatyResolver.setup()
  return new Promise(resolve => {
    let reported = false
    const listener: experimental.ResolverListener = endpoints => {
      if (!reported) {
        reported = true
        resolve(endpoints)
      }
      return true
    }
    const resolver = experimental.createResolver(target, listener, {})
    resolver.updateResolution()
  })
}

test('wechaty resolver reports the discovered address as one endpoint', async () => {
  const TOKEN = '__token__'
  const HOST = '10.1.2.3'
  const PORT = 1024

  stubDiscover(() => Promise.resolve({ host: HOST, port: PORT }))

  const result = await resolveOnce({ scheme: 'wechaty', authority: '', path: TOKEN })

  assert.ok(result.ok, 'should resolve')
  assert.deepEqual(result.value, [ { addresses: [ { host: HOST, port: PORT } ] } ], 'should get the puppet server address')
})

test('wechaty resolver passes the target authority down to WechatyToken', async () => {
  const AUTHORITY = 'custom.authority.com'
  let seenAuthority: undefined | string

  stubDiscover(function () {
    seenAuthority = this.authority
    return Promise.resolve({ host: '1.1.1.1', port: 10 })
  })

  await resolveOnce({ scheme: 'wechaty', authority: AUTHORITY, path: 'token' })

  assert.equal(seenAuthority, AUTHORITY, 'should pass authority down to WechatyToken')
})

test('wechaty resolver reports UNAVAILABLE once for an unknown token', async () => {
  stubDiscover(() => Promise.resolve(undefined))

  const result = await resolveOnce({ scheme: 'wechaty', authority: '', path: 'unknown' })

  assert.ok(!result.ok, 'should fail')
  assert.equal(result.error.code, GrpcStatus.UNAVAILABLE)
  assert.match(result.error.details, /token "unknown" does not exist/)
})

test('wechaty resolver reports a discovery error once, with its message', async () => {
  let reports = 0
  stubDiscover(() => Promise.reject(new Error('boom')))
  WechatyResolver.setup()

  const result = await new Promise<experimental.StatusOr<experimental.Endpoint[]>>(resolve => {
    const resolver = experimental.createResolver(
      { scheme: 'wechaty', authority: '', path: 'broken' },
      endpoints => {
        reports++
        resolve(endpoints)
        return true
      },
      {},
    )
    resolver.updateResolution()
  })
  // Let any second, buggy report arrive before counting.
  await new Promise(resolve => setTimeout(resolve, 10))

  assert.ok(!result.ok, 'should fail')
  assert.match(result.error.details, /boom/)
  assert.equal(reports, 1, 'reports the failure exactly once')
})

test('getDefaultAuthority falls back to api.chatie.io', () => {
  assert.equal(WechatyResolver.getDefaultAuthority({ path: 'token' }), 'api.chatie.io')
  assert.equal(WechatyResolver.getDefaultAuthority({ authority: 'example.com', path: 'token' }), 'example.com')
})
