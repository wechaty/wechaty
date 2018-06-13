#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadchatMessagePayload,
}                                 from '../padchat-schemas'

import {
  roomTopicEventMessageParser,
}                               from './room-event-topic-message-parser'

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
