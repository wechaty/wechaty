#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadchatMessagePayload,
}                                 from '../padchat-schemas'

import {
  roomJoinEventMessageParser,
  roomLeaveEventMessageParser,
  roomTopicEventMessageParser,
}                               from './room-event-message-parser'

test('roomJoinEventMessageParser() not detected', async t => {
  t.equal(
    roomJoinEventMessageParser(undefined as any),
    null,
    'should return null for undefined',
  )

  t.equal(
    roomJoinEventMessageParser('null' as any),
    null,
    'should return null for null',
  )

  t.equal(
    roomJoinEventMessageParser('test' as any),
    null,
    'should return null for string',
  )

  t.equal(
    roomJoinEventMessageParser({} as any),
    null,
    'should return null for empty object',
  )

  t.equal(
    roomJoinEventMessageParser({ content: 'fsdfsfsdfasfas' } as PadchatMessagePayload ),
    null,
    'should return null for PadchatMessagePayload with unknown content',
  )

})

test('roomLeaveEventMessageParser() not detected', async t => {
  t.equal(
    roomLeaveEventMessageParser(undefined as any),
    null,
    'should return null for undefined',
  )

  t.equal(
    roomLeaveEventMessageParser('null' as any),
    null,
    'should return null for null',
  )

  t.equal(
    roomLeaveEventMessageParser('test' as any),
    null,
    'should return null for string',
  )

  t.equal(
    roomLeaveEventMessageParser({} as any),
    null,
    'should return null for empty object',
  )

  t.equal(
    roomLeaveEventMessageParser({ content: 'fsdfsfsdfasfas' } as PadchatMessagePayload ),
    null,
    'should return null for PadchatMessagePayload with unknown content',
  )

})

test('roomTopicEventMessageParser() not detected', async t => {
  t.equal(
    roomTopicEventMessageParser(undefined as any),
    null,
    'should return null for undefined',
  )

  t.equal(
    roomTopicEventMessageParser('null' as any),
    null,
    'should return null for null',
  )

  t.equal(
    roomTopicEventMessageParser('test' as any),
    null,
    'should return null for string',
  )

  t.equal(
    roomTopicEventMessageParser({} as any),
    null,
    'should return null for empty object',
  )

  t.equal(
    roomTopicEventMessageParser({ content: 'fsdfsfsdfasfas' } as PadchatMessagePayload ),
    null,
    'should return null for PadchatMessagePayload with unknown content',
  )

})
