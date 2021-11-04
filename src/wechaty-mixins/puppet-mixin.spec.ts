#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'

import type {
  PuppetMixin,
  ProtectedPropertyPuppetMixin,
}                                             from './puppet-mixin.js'

test('ProtectedPropertyPuppetMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPuppetMixin, keyof InstanceType<PuppetMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
