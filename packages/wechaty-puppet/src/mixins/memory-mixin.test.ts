/**
 * Unit tests for `memory-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PuppetSkeleton } from '../puppet/puppet-skeleton.ts'

import type {
  MemoryMixin,
  ProtectedPropertyMemoryMixin,
}                                   from './memory-mixin.ts'
import {
  memoryMixin,
}                                   from './memory-mixin.ts'

test('ProtectedPropertyMemoryMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyMemoryMixin, keyof InstanceType<MemoryMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('MemoryMixin', async _t => {
  const Test = class extends memoryMixin(PuppetSkeleton) {}

  const test = new Test()
  assert.ok(test.memory, 'should has memory')
  assert.ok(!(test.memory.name), 'should has no memory name')

  const memoryGet = () => test.memory.get('test')

  await assert.rejects(memoryGet, 'should reject get() before memory.load()')
  await test.start()
  await assert.doesNotReject(memoryGet, 'should resolve get() after memory.load()')
})
