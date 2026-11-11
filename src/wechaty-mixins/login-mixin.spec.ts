#!/usr/bin/env node
import { test } from 'node:test'
import assert from 'node:assert/strict'

import type {
  LoginMixin,
  ProtectedPropertyLoginMixin,
}                                             from './login-mixin.ts'

test('ProtectedPropertyLoginMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyLoginMixin, keyof InstanceType<LoginMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
