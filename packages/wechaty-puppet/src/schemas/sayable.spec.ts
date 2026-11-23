#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import type {
  MessageType,
}               from './message.js'

import type {
  SayablePayload,
  SayablePayloadUnsupportedType,
}                                 from './sayable.js'

test('SayablePayloadUnsupportedType must be subset of MessageType', async t => {
  type NotExistInMessageType = Exclude<SayablePayloadUnsupportedType, keyof typeof MessageType>
  type NotExistTest = NotExistInMessageType extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match MessageType for every unsupported type')
})

test('SayablePayloadUnsupportedType & SayablePayload[type] must contain all MessageType', async t => {
  type ListedTypes = SayablePayload['type'] | SayablePayloadUnsupportedType
  type NotListedType = Exclude<keyof typeof MessageType, ListedTypes>
  type NotExistTest = NotListedType extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should list all MessageType in our sayable defination')
})
