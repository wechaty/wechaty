#!/usr/bin/env -S node --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type { Puppet } from './mod.js'
import type { ProtectedProperty } from './interface.js'

test('ProtectedProperties', async t => {
  type NotExistInPuppet = Exclude<ProtectedProperty, keyof Puppet>
  type NotExistTest = NotExistInPuppet extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Puppet properties for every protected property')
})
