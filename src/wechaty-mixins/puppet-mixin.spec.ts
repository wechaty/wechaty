#!/usr/bin/env node
import { test } from 'node:test'
import assert from 'node:assert/strict'

import type {
  PuppetMixin,
  ProtectedPropertyPuppetMixin,
}                                             from './puppet-mixin.ts'

test('ProtectedPropertyPuppetMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPuppetMixin, keyof InstanceType<PuppetMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
