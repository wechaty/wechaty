/**
 * Unit tests for `ready-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  ReadyMixin,
} from './ready-mixin.ts'

test('ProtectedPropertyReadyMixin', async _t => {
  type NotExistInMixin = Exclude<never, keyof InstanceType<ReadyMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
