#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  isRoomId,
  isContactId,
  isContactOfficialId,
  isPayload,
  isStrangerV1,
  isStrangerV2,
}                             from './is-type'

test('isRoomId()', async t => {
  const ROOM_ID     = 'xxx@chatroom'
  const NOT_ROOM_ID = 'xxxxxxx'

  t.ok(isRoomId(ROOM_ID), 'should return true for ROOM_ID')
  t.notOk(isRoomId(NOT_ROOM_ID), 'should return false for ROOM_ID')
  t.throws(() => isRoomId(undefined), 'should throw exception for undifined')
  t.doesNotThrow(() => isRoomId('test'), 'should not throw for string')
})

test('isContactId()', async t => {
  const CONTACT_ID     = 'sxxfdsa'
  const NOT_CONTACT_ID = 'fdsafasd@chatroom'

  t.ok(isContactId(CONTACT_ID), 'should return true for CONTACT_ID')
  t.notOk(isContactId(NOT_CONTACT_ID), 'should return false for CONTACT_ID')
  t.throws(() => isContactId(undefined), 'should throw exception for undifined')
  t.doesNotThrow(() => isContactId('test'), 'should not throw for string')
})

test('isContactOfficialId()', async t => {
  const OFFICIAL_CONTACT_ID     = 'gh_sxxfdsa'
  const NOT_OFFICIAL_CONTACT_ID = 'fdsafasd@chatroom'

  t.ok(isContactOfficialId(OFFICIAL_CONTACT_ID), 'should return true for OFFICIAL_CONTACT_ID')
  t.notOk(isContactOfficialId(NOT_OFFICIAL_CONTACT_ID), 'should return false for NOT_OFFICIAL_CONTACT_ID')
  t.throws(() => isContactOfficialId(undefined), 'should throw exception for undifined')
  t.doesNotThrow(() => isContactOfficialId('test'), 'should not throw for string')
})

test('isStrangerV1()', async t => {
  const STRANGER_V1     = 'v1_999999'
  const NOT_STRANGER_V1 = '9999991'

  t.equal(isStrangerV1(STRANGER_V1),      true,   'should return true for STRANGER_V1')
  t.equal(isStrangerV1(NOT_STRANGER_V1),  false,  'should return false for NOT_STRANGER_V1')
})

test('isStrangerV2()', async t => {
  const STRANGER_V2     = 'v2_999999'
  const NOT_STRANGER_V2 = '999999v2'

  t.equal(isStrangerV2(STRANGER_V2),     true, 'should return true for STRANGER_V2')
  t.equal(isStrangerV2(NOT_STRANGER_V2), false, 'should return false for NOT_STRANGER_V2')
})

test('isPayload()', async t => {
  t.equal(isPayload(undefined as any) , false, 'undefined is not payload')
  t.equal(isPayload(null as any)      , false, 'null is not payload')
  t.equal(isPayload({})               , false, '{} is not payload')
  t.equal(isPayload({a: 42})          , true, 'valid payload')
})
