#!/usr/bin/env node

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryCard } from 'memory-card'

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

test('WechatySkeleton supports addEventListener with AbortSignal and removes legacy on/off methods', async () => {
  class SkeletonTest extends WechatySkeleton {}
  const skeleton = new SkeletonTest()

  assert.equal((skeleton as any).on, undefined, 'legacy on method must be removed')
  assert.equal((skeleton as any).off, undefined, 'legacy off method must be removed')

  const ac = new AbortController()
  let targetCount = 0
  skeleton.addEventListener('heartbeat', () => {
    targetCount++
  }, { signal: ac.signal })

  skeleton.dispatchEvent(new CustomEvent('heartbeat', { detail: 'data1' }))
  assert.equal(targetCount, 1)

  ac.abort()
  skeleton.dispatchEvent(new CustomEvent('heartbeat', { detail: 'data2' }))
  assert.equal(targetCount, 1, 'aborted listener on addEventListener() must not be called')
})

test('WechatySkeleton.init() rethrows non-"already loaded" memory load error', async t => {
  class SkeletonTest extends WechatySkeleton {}
  const skeleton = new SkeletonTest()

  t.mock.method(MemoryCard.prototype, 'load', async () => {
    throw new Error('database connection failed')
  })

  await assert.rejects(
    async () => {
      await skeleton.init()
    },
    /database connection failed/,
    'init() must rethrow unexpected memory load errors',
  )
})

