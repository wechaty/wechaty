/**
 * Unit test for `PuppetServer`: its version.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Puppet } from 'wechaty-puppet'

import {
  PuppetServer,
  type PuppetServerOptions,
}                          from './puppet-server.ts'

test('version()', async _t => {
  const options: PuppetServerOptions = {
    endpoint : '127.0.0.1:8788',
    puppet   : {} as Puppet,
    token    : 'secret',
  }

  const puppet = new PuppetServer(options)
  assert.ok(puppet.version(), 'should have version() method')
})
