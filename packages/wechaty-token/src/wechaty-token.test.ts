/**
 * Unit tests for `WechatyToken`: SNI parsing, and discovery against an HTTP
 * mock (`nock`, with real network access disabled), including the retry
 * policy's limit of three retries and the 404 "unknown token" case.
 */
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import nock from 'nock'

import { WechatyToken } from './wechaty-token.ts'

before(() => nock.disableNetConnect())
after(() => {
  nock.cleanAll()
  nock.enableNetConnect()
})

test('WechatyToken sni() & toString()', async () => {
  /**
   * [token, sni]
   */
  const FIXTURES = [
    [
      'TOKEN',
      undefined,
    ],
    [
      'INSECURE_TOKEN',
      'insecure', // should normalized to lowercase
    ],
    [
      'wxwork_ID',
      'wxwork',
    ],
    [
      'puppet_wxwork_ID',
      'puppet_wxwork',
    ],
  ] as const

  for (const [token, sni] of FIXTURES) {
    const wechatyToken = new WechatyToken(token)
    assert.equal(wechatyToken.sni, sni, `token.sni() => ${sni}`)
    assert.equal(wechatyToken.toString(), token, `token.toString() => ${sni}`)
  }
})

test('WechatyToken.discover() resolved', async () => {
  const TOKEN = '__token__'
  const EXPECTED_ADDRESS = {
    host: '1.2.3.4',
    port: 5678,
  }

  const scope = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(200, EXPECTED_ADDRESS)

  const token = new WechatyToken(TOKEN)
  const address = await token.discover()

  // console.info(address)
  assert.deepEqual(address, EXPECTED_ADDRESS, 'should get address')
  scope.done()
})

test('WechatyToken.discover() with custom authority', async () => {
  const AUTHORITY = 'authority.com'
  const TOKEN = '__token__'
  const EXPECTED_ADDRESS = {
    host: '1.2.3.4',
    port: 5678,
  }

  const scope = nock(`https://${AUTHORITY}`)
    .get(`/v0/hosties/${TOKEN}`)
    .reply(200, EXPECTED_ADDRESS)

  const wechatyToken = new WechatyToken({
    authority: AUTHORITY,
    token: TOKEN,
  })
  const address = await wechatyToken.discover()

  // console.info(address)
  assert.deepEqual(address, EXPECTED_ADDRESS, `should get address from authority ${AUTHORITY}`)
  scope.done()
})

test('WechatyToken.discover() retry succeed: HTTP/5XX <= 3', async () => {
  const TOKEN = '__token__'
  const EXPECTED_ADDRESS = {
    host: '1.2.3.4',
    port: 5678,
  }

  const scope500 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(500)
  const scope501 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(501)
  const scope502 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(502)

  const scope200 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(200, EXPECTED_ADDRESS)

  const wechatyToken = new WechatyToken(TOKEN)
  const address = await wechatyToken.discover()

  // console.info(address)
  assert.deepEqual(address, EXPECTED_ADDRESS, 'should get address')
  scope200.done()
  scope500.done()
  scope501.done()
  scope502.done()
})

test('WechatyToken.discover() retry failed: too many HTTP/500 (>3)', async () => {
  const TOKEN = '__token__'
  const EXPECTED_ADDRESS = {
    host: '1.2.3.4',
    port: 5678,
  }

  const scope500 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(500)
  const scope501 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(501)
  const scope502 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(502)
  const scope503 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(503)

  const scope200 = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(200, EXPECTED_ADDRESS)

  const wechatyToken = new WechatyToken(TOKEN)
  const address = await wechatyToken.discover()

  // console.info(address)
  assert.equal(address, undefined, 'should not get address')

  assert.equal(scope200.isDone(), false, 'should not call the 4th times')
  /**
   * https://github.com/nock/nock/issues/1495#issuecomment-791079068
   */
  ;(scope200 as any).interceptors.forEach(nock.removeInterceptor)

  scope500.done()
  scope501.done()
  scope502.done()
  scope503.done()
})

test('WechatyToken.discover() 404', async () => {
  const TOKEN = '__token__'

  const scope = nock('https://api.chatie.io')
    .get(`/v0/hosties/${TOKEN}`)
    .reply(404)

  const wechatyToken = new WechatyToken(TOKEN)
  const address = await wechatyToken.discover()

  // console.info(address)
  assert.equal(address, undefined, 'should get undefined for 404 NotFound')
  scope.done()
})
