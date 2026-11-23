/**
 * Unit tests for `type-name.ts`: reverse lookups on the `const` type maps,
 * which replaced the TypeScript enums' reverse mappings in 2.0.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { typeName } from './type-name.ts'
import { DirtyType } from './dirty.ts'
import { MessageType } from './message.ts'

test('typeName() returns the key of a value in a const type map', () => {
  assert.equal(typeName(MessageType, MessageType.Text), 'Text')
  assert.equal(typeName(MessageType, 0), 'Unknown')
  assert.equal(typeName(DirtyType, DirtyType.RoomMember), 'RoomMember')
})

test('typeName() returns undefined for a value with no key', () => {
  assert.equal(typeName(MessageType, 17), undefined, '17 is unused in MessageType')
  assert.equal(typeName(MessageType, -1), undefined)
})

test('the type maps keep their 1.x numbers', () => {
  // The numbers cross the gRPC wire, so they must never change.
  assert.equal(MessageType.Text, 7)
  assert.equal(MessageType.Video, 15)
  assert.equal(MessageType.System, 18)
  assert.equal(DirtyType.Post, 6)
})
