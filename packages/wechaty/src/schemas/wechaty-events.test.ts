/**
 * Unit tests for `wechaty-events.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  WechatyEventTarget,
  WechatyEventTargetInterface,
  WechatyEventEmitter,
  WechatyEventEmitterInterface,
  WechatyEventEmitterInstance,
} from './mod.ts'
import {
  WechatyEventEmitter as WechatyEventEmitterValue,
} from './mod.ts'

type AssertEqual<T, Expected> =
  [T] extends [Expected]
    ? [Expected] extends [T]
      ? true
      : false
    : false

test('WechatyEventTarget and WechatyEventTargetInterface type equality', async _t => {
  const isEventTargetSame: AssertEqual<WechatyEventTarget, WechatyEventTargetInterface> = true
  assert.ok(isEventTargetSame, 'WechatyEventTarget and WechatyEventTargetInterface must be identical types')
})

test('WechatyEventEmitter type aliases equality', async _t => {
  const isEmitterSame: AssertEqual<WechatyEventEmitter, WechatyEventEmitterInterface> = true
  const isInstanceSame: AssertEqual<WechatyEventEmitter, WechatyEventEmitterInstance> = true

  assert.ok(isEmitterSame, 'WechatyEventEmitter and WechatyEventEmitterInterface must be identical types')
  assert.ok(isInstanceSame, 'WechatyEventEmitter and WechatyEventEmitterInstance must be identical types')
})

test('WechatyEventEmitter value and constructor', async _t => {
  assert.equal(typeof WechatyEventEmitterValue, 'function', 'WechatyEventEmitter must be a constructor function')

  const emitter = new WechatyEventEmitterValue()
  assert.ok(emitter, 'new WechatyEventEmitter() should instantiate successfully')
  assert.equal(typeof emitter.on, 'function', 'emitter should have .on method')
  assert.equal(typeof emitter.addEventListener, 'function', 'emitter should have .addEventListener method')
  assert.equal(typeof emitter.removeEventListener, 'function', 'emitter should have .removeEventListener method')
  assert.equal(typeof emitter.dispatchEvent, 'function', 'emitter should have .dispatchEvent method')
})
