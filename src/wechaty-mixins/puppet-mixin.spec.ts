#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'

import type {
  PuppetEventBridgeMixin,
  ProtectedPropertyPuppetEventBridgeMixin,
}                                             from './puppet-mixin.js'

test('ProtectedPropertyPuppetEventBridgeMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPuppetEventBridgeMixin, keyof InstanceType<PuppetEventBridgeMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
