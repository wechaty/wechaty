/**
 * Unit tests for `sayable.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  MessageType,
}               from './message.ts'

import type {
  SayablePayload,
  SayablePayloadUnsupportedType,
}                                 from './sayable.ts'

test('SayablePayloadUnsupportedType must be subset of MessageType', async _t => {
  type NotExistInMessageType = Exclude<SayablePayloadUnsupportedType, keyof typeof MessageType>
  type NotExistTest = NotExistInMessageType extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match MessageType for every unsupported type')
})

test('SayablePayloadUnsupportedType & SayablePayload[type] must contain all MessageType', async _t => {
  type ListedTypes = SayablePayload['type'] | SayablePayloadUnsupportedType
  type NotListedType = Exclude<keyof typeof MessageType, ListedTypes>
  type NotExistTest = NotListedType extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should list all MessageType in our sayable defination')
})
