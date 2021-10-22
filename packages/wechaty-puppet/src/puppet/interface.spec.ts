#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type { PuppetAbstractImpl } from './mod.js'
import type { PuppetProtectedProperty } from './interface.js'

test('ProtectedProperties', async t => {
  type NotExistInPuppet = Exclude<PuppetProtectedProperty, keyof PuppetAbstractImpl>
  type NotExistTest = NotExistInPuppet extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Puppet properties for every protected property')
})
