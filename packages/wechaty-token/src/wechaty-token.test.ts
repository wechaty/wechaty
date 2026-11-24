/**
 * Shared tests for Wechaty token parsing, generation, and discovery. A
 * test-scoped Fetch mock returns standard responses without network access.
 */
import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { WechatyToken } from './wechaty-token.ts'

const TOKEN = '__token__'
const ADDRESS = { host: '1.2.3.4', port: 5678 }

/** Returns one response per Fetch call and fails an unexpected request. */
function mockDiscovery (t: TestContext, ...responses: Response[]) {
  return t.mock.method(globalThis, 'fetch', async () => {
    const response = responses.shift()
    assert.ok(response, 'unexpected discovery request')
    return response
  })
}

test('WechatyToken parses the SNI and keeps the original token', () => {
  const fixtures = [
    [ 'TOKEN', undefined ],
    [ '_TOKEN', undefined ],
    [ 'INSECURE_TOKEN', 'insecure' ],
    [ 'wxwork_ID', 'wxwork' ],
    [ 'puppet_wxwork_ID', 'puppet_wxwork' ],
  ] as const

  for (const [token, sni] of fixtures) {
    const parsed = new WechatyToken(token)
    assert.equal(parsed.sni, sni)
    assert.equal(parsed.toString(), token)
  }
})

test('WechatyToken generates a UUID with the requested SNI', () => {
  const generated = WechatyToken.generate('puppet_mock')
  assert.match(generated, /^puppet_mock_[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
  assert.equal(new WechatyToken(generated).sni, 'puppet_mock')
  assert.equal(new WechatyToken(WechatyToken.generate()).sni, 'uuid')
})

test('WechatyToken.discover() uses the default HTTPS authority', async t => {
  const request = mockDiscovery(t, Response.json(ADDRESS))

  assert.deepEqual(await new WechatyToken(TOKEN).discover(), ADDRESS)
  assert.equal(request.mock.callCount(), 1)
  assert.deepEqual(request.mock.calls[0]?.arguments, [
    `https://api.chatie.io/v0/hosties/${TOKEN}`,
    { cache: 'no-store', credentials: 'omit', redirect: 'manual' },
  ])
})

test('WechatyToken.discover() uses a custom authority', async t => {
  const request = mockDiscovery(t, Response.json(ADDRESS))
  const token = new WechatyToken({ authority: 'authority.example', token: TOKEN })

  assert.deepEqual(await token.discover(), ADDRESS)
  assert.equal(request.mock.callCount(), 1)
  assert.equal(request.mock.calls[0]?.arguments[0], `https://authority.example/v0/hosties/${TOKEN}`)
})

test('WechatyToken.discover() can succeed on the third retry', async t => {
  const request = mockDiscovery(t,
    new Response(null, { status: 500 }),
    new Response(null, { status: 501 }),
    new Response(null, { status: 502 }),
    Response.json(ADDRESS),
  )

  assert.deepEqual(await new WechatyToken(TOKEN).discover(), ADDRESS)
  assert.equal(request.mock.callCount(), 4)
})

test('WechatyToken.discover() stops after three retries', async t => {
  const request = mockDiscovery(t,
    new Response(null, { status: 500 }),
    new Response(null, { status: 501 }),
    new Response(null, { status: 502 }),
    new Response(null, { status: 503 }),
  )

  assert.equal(await new WechatyToken(TOKEN).discover(), undefined)
  assert.equal(request.mock.callCount(), 4)
})

test('WechatyToken.discover() returns undefined for an unknown token without retrying', async t => {
  const request = mockDiscovery(t, new Response('Not Found', { status: 404 }))

  assert.equal(await new WechatyToken(TOKEN).discover(), undefined)
  assert.equal(request.mock.callCount(), 1)
})

test('WechatyToken.discover() returns undefined for a malformed address', async t => {
  const request = mockDiscovery(t, Response.json({ host: ADDRESS.host }))

  assert.equal(await new WechatyToken(TOKEN).discover(), undefined)
  assert.equal(request.mock.callCount(), 1)
})
