#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import {
  friendshipConfirmEventMessageParser,
  friendshipReceiveEventMessageParser,
  friendshipVerifyEventMessageParser,
}                                       from './friendship-event-message-parser'

test('friendshipConfirmEventMessageParser()', async t => {
  t.equal(
    friendshipConfirmEventMessageParser(undefined as any),
    null,
    'should parse `undefined`',
  )
  t.equal(
    friendshipConfirmEventMessageParser(null as any),
    null,
    'should parse `null`',
  )
  t.equal(
    friendshipConfirmEventMessageParser({} as any),
    null,
    'should parse `{}`',
  )
  t.equal(
    friendshipConfirmEventMessageParser({ content: 'fadsfsfasfs' } as any),
    null,
    'should parse invalid content',
  )
})

test('friendshipReceiveEventMessageParser()', async t => {
  t.equal(
    friendshipReceiveEventMessageParser(undefined as any),
    null,
    'should parse `undefined`',
  )
  t.equal(
    friendshipReceiveEventMessageParser(null as any),
    null,
    'should parse `null`',
  )
  t.equal(
    friendshipReceiveEventMessageParser({} as any),
    null,
    'should parse `{}`',
  )
  t.equal(
    friendshipReceiveEventMessageParser({ content: 'fadsfsfasfs' } as any),
    null,
    'should parse invalid content',
  )
})
test('friendshipVerifyEventMessageParser()', async t => {
  t.equal(
    friendshipVerifyEventMessageParser(undefined as any),
    null,
    'should parse `undefined`',
  )
  t.equal(
    friendshipVerifyEventMessageParser(null as any),
    null,
    'should parse `null`',
  )
  t.equal(
    friendshipVerifyEventMessageParser({} as any),
    null,
    'should parse `{}`',
  )
  t.equal(
    friendshipVerifyEventMessageParser({ content: 'fadsfsfasfs' } as any),
    null,
    'should parse invalid content',
  )
})
