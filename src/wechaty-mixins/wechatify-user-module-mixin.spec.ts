#!/usr/bin/env -S node --import=tsx/esm

import { test } from 'node:test'
import assert from 'node:assert/strict'

import type {
  WechatifyUserModuleMixin,
  ProtectedPropertyWechatifyUserModuleMixin,
}                                               from './wechatify-user-module-mixin.js'

test('ProtectedPropertyWechatifyUserModuleMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyWechatifyUserModuleMixin, keyof InstanceType<WechatifyUserModuleMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
