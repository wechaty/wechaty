/**
 * Smoke test for the packed tarball (run by scripts/npm-pack-testing.sh in a
 * temporary ESM project): a PuppetMock with a Mocker logs in a mocked user and
 * reports it, and the embedded version is the real one.
 */
import assert from 'node:assert/strict'

import {
  mock,
  PuppetMock,
  VERSION,
}                 from 'wechaty-puppet-mock'

assert.notEqual(VERSION, '0.0.0', 'version should not be 0.0.0 when prepared for publishing')

const mocker = new mock.Mocker()
const puppet = new PuppetMock({ mocker })
await puppet.start()

const user = mocker.createContact({ name: 'smoke' })
const login = new Promise<string>(resolve => puppet.once('login', payload => resolve(payload.contactId)))
mocker.login(user)
assert.equal(await login, user.id, 'should log in the mocked user')

await puppet.stop()
console.info(`PuppetMock v${puppet.version()} smoke testing passed.`)
