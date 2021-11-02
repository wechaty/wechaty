#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'

import type {
  PluginMixin,
  ProtectedPropertyPluginMixin,
}                                             from './plugin-mixin.js'

test('ProtectedPropertyPluginMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPluginMixin, keyof InstanceType<PluginMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
