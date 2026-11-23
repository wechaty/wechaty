/**
 * Smoke test for the packed tarball (run by scripts/npm-pack-testing.sh in a
 * temporary project): the public API loads from the published `dist/` and the
 * generated version is not the 0.0.0 source placeholder.
 */
import assert from 'node:assert/strict'

import {
  VERSION,
  WechatyResolver,
  WechatyToken,
}                 from 'wechaty-token'

const wechatyToken = new WechatyToken('SNI_UUID')

assert.equal(wechatyToken.token, 'SNI_UUID', 'TOKEN should be SNI_UUID')
assert.equal(wechatyToken.sni, 'sni', 'SNI should be sni')
assert.notEqual(VERSION, '0.0.0', 'version should not be 0.0.0 when prepared for publishing')

WechatyResolver.setup()

console.info(`wechaty-token v${wechatyToken.version()} smoke testing passed.`)
