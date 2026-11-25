#!/usr/bin/env node

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  WechatySkeleton,
  type WechatySkeletonProtectedProperty,
}                                         from './wechaty-skeleton.ts'

test('ProtectedPropertyWechatySkeleton', async _t => {
  type NotExistInMixin = Exclude<WechatySkeletonProtectedProperty, keyof WechatySkeleton>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('WechatySkeleton forwards options to on() and supports addEventListener with AbortSignal', async () => {
  class SkeletonTest extends WechatySkeleton {}
  const skeleton = new SkeletonTest()

  const ac = new AbortController()
  let onCount = 0
  skeleton.on('heartbeat', () => {
    onCount++
  }, { signal: ac.signal })

  skeleton.emit('heartbeat', 'data1')
  assert.equal(onCount, 1)

  ac.abort()
  skeleton.emit('heartbeat', 'data2')
  assert.equal(onCount, 1, 'aborted listener on on() must not be called')

  const ac2 = new AbortController()
  let targetCount = 0
  skeleton.addEventListener('heartbeat', () => {
    targetCount++
  }, { signal: ac2.signal })

  skeleton.emit('heartbeat', 'data3')
  assert.equal(targetCount, 1)

  ac2.abort()
  skeleton.emit('heartbeat', 'data4')
  assert.equal(targetCount, 1, 'aborted listener on addEventListener() must not be called')
})
