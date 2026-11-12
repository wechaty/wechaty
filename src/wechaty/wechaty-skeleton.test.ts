#!/usr/bin/env node

import { test } from 'node:test'
import assert from 'node:assert/strict'

import type {
  WechatySkeleton,
  WechatySkeletonProtectedProperty,
}                                         from './wechaty-skeleton.ts'

test('ProtectedPropertyWechatySkeleton', async _t => {
  type NotExistInMixin = Exclude<WechatySkeletonProtectedProperty, keyof WechatySkeleton>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
