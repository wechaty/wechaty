#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}           from 'tstest'

import {
  MemoryCard,
}                 from '../config.js'

import {
  ContactGender,
  type ContactPayload,
  ContactType,
}                                 from '../schemas/contact.js'
import {
  MessagePayload,
  MessageQueryFilter,
  MessageType,
}                                 from '../schemas/message.js'
import type {
  RoomPayload,
}                                 from '../schemas/room.js'

import { PuppetSkeleton } from './puppet-skeleton.js'

/**
 * The Fixture
 */
import {
  PuppetTest,
}               from '../../tests/fixtures/puppet-test/puppet-test.js'

test('contactQueryFilterFunction()', async t => {

  const TEXT_REGEX = 'query by regex'
  const TEXT_TEXT  = 'query by text'

  const PAYLOAD_LIST: ContactPayload[] = [
    {
      alias  : TEXT_TEXT,
      avatar : 'mock',
      gender : ContactGender.Unknown,
      id     : 'id1',
      name   : TEXT_REGEX,
      phone  : [],
      type   : ContactType.Individual,
    },
    {
      alias  : TEXT_REGEX,
      avatar : 'mock',
      gender : ContactGender.Unknown,
      id     : 'id2',
      name   : TEXT_TEXT,
      phone  : [],
      type   : ContactType.Individual,
    },
    {
      alias  : TEXT_TEXT,
      avatar : 'mock',
      gender : ContactGender.Unknown,
      id     : 'id3',
      name   : TEXT_REGEX,
      phone  : [],
      type   : ContactType.Individual,
    },
    {
      alias  : TEXT_REGEX,
      avatar : 'mock',
      gender : ContactGender.Unknown,
      id     : 'id4',
      name   : TEXT_TEXT,
      phone  : [],
      type   : ContactType.Individual,
    },
  ]

  const REGEX_VALUE = new RegExp(TEXT_REGEX)
  const TEXT_VALUE  = TEXT_TEXT

  const puppet = new PuppetTest()

  void t.test('filter name by regex', async t => {
    const QUERY   = { name: REGEX_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter the query to id list')
  })

  void t.test('filter name by text', async t => {
    const QUERY = { name: TEXT_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter query to id list')
  })

  void t.test('filter alias by regex', async t => {
    const QUERY = { alias: REGEX_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter query to id list')
  })

  void t.test('filter alias by text', async t => {
    const QUERY = { alias: TEXT_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter query to id list')
  })

  void t.test('filter contact existing id', async t => {
    const QUERY = { id: 'id1' }
    const ID_LIST = ['id1']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter query to id list by id')
  })

  void t.test('filter contact non-existing id', async t => {
    const QUERY = { id: 'fasdfsdfasfas' }
    const ID_LIST = [] as string[]

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter query to id list by id')
  })

  void t.test('throw if filter key unknown', async t => {
    t.throws(() => puppet.contactQueryFilterFactory({ xxxx: 'test' } as any), 'should throw')
  })

  void t.test('throw if filter key are more than one', async t => {
    t.throws(() => puppet.contactQueryFilterFactory({
      alias : 'test',
      name  : 'test',
    }), 'should throw')
  })
})

test('roomQueryFilterFunction()', async t => {

  const TEXT_REGEX = 'query by regex'
  const TEXT_TEXT  = 'query by text'

  const PAYLOAD_LIST: RoomPayload[] = [
    {
      adminIdList : [],
      id           : 'id1',
      memberIdList : [],
      topic        : TEXT_TEXT,
    },
    {
      adminIdList : [],
      id           : 'id2',
      memberIdList : [],
      topic        : TEXT_REGEX,
    },
    {
      adminIdList : [],
      id           : 'id3',
      memberIdList : [],
      topic        : TEXT_TEXT,
    },
    {
      adminIdList : [],
      id           : 'id4',
      memberIdList : [],
      topic        : TEXT_REGEX,
    },
  ]

  const REGEX_VALUE = new RegExp(TEXT_REGEX)
  const TEXT_VALUE  = TEXT_TEXT

  const puppet = new PuppetTest()

  void t.test('filter name by regex', async t => {
    const QUERY   = { topic: REGEX_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter the query to id list')
  })

  void t.test('filter name by text', async t => {
    const QUERY = { topic: TEXT_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter query to id list by text')
  })

  void t.test('filter name by existing id', async t => {
    const QUERY = { id: 'id4' }
    const ID_LIST = ['id4']

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter query to id list by id')
  })

  void t.test('filter name by non-existing id', async t => {
    const QUERY = { id: 'fsdfasfasfsdfsaf' }
    const ID_LIST = [] as string[]

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.same(idList, ID_LIST, 'should filter query to id list by id')
  })

  void t.test('throw if filter key unknown', async t => {
    t.throws(() => puppet.roomQueryFilterFactory({ xxx: 'test' } as any), 'should throw')
  })

  void t.test('throw if filter key are more than one', async t => {
    t.throws(() => puppet.roomQueryFilterFactory({
      alias: 'test',
      topic: 'test',
    } as any), 'should throw')
  })
})

/**
 * Huan(202110): remove contactRoomList
 *  because it seems not being used by Wechaty at all
 *    and it is very to be implemented in the user land
 */
// test('contactRoomList()', async t => {
//   const puppet = new PuppetTest()

//   const sandbox = sinon.createSandbox()

//   const CONTACT_ID_1 = 'contact-id-1'
//   const CONTACT_ID_2 = 'contact-id-2'
//   const CONTACT_ID_3 = 'contact-id-3'

//   const ROOM_ID_1 = 'room-id-1'
//   const ROOM_ID_2 = 'room-id-2'

//   const ROOM_PAYLOAD_LIST: RoomPayload[] = [
//     {
//       adminIdList : [],
//       id: ROOM_ID_1,
//       memberIdList: [
//         CONTACT_ID_1,
//         CONTACT_ID_2,
//       ],
//       topic: 'room-topic-1',
//     },
//     {
//       adminIdList : [],
//       id: ROOM_ID_2,
//       memberIdList: [
//         CONTACT_ID_2,
//         CONTACT_ID_3,
//       ],
//       topic: 'room-topic-2',
//     },
//   ]
//   sandbox.stub(puppet, 'roomList').resolves(ROOM_PAYLOAD_LIST.map(payload => payload.id))
//   sandbox.stub(puppet, 'roomPayload').callsFake(async roomId => {
//     for (const payload of ROOM_PAYLOAD_LIST) {
//       if (payload.id === roomId) {
//         return payload
//       }
//     }
//     throw new Error('no payload for room id ' + roomId)
//   })

//   const roomIdList1 = await puppet.contactRoomList(CONTACT_ID_1)
//   const roomIdList2 = await puppet.contactRoomList(CONTACT_ID_2)
//   const roomIdList3 = await puppet.contactRoomList(CONTACT_ID_3)

//   t.same(roomIdList1, [ROOM_ID_1], 'should get room 1 for contact 1')
//   t.same(roomIdList2, [ROOM_ID_1, ROOM_ID_2], 'should get room 1&2 for contact 2')
//   t.same(roomIdList3, [ROOM_ID_2], 'should get room 2 for contact 3')
// })

/**
 * Huan(202110): the reset logic has been refactored
 *  See: reset() method and 'reset' event breaking change #157
 *    https://github.com/wechaty/puppet/issues/157
 */
test.skip('reset event throttle for reset()', async t => {
  const puppet = new PuppetTest({})

  const sandbox = sinon.createSandbox()

  const timer = sandbox.useFakeTimers()
  const reset = sandbox.stub(puppet as any, 'reset')
  await puppet.start()

  puppet.emit('reset', { data: 'testing' })
  t.equal(reset.callCount, 1, 'should call reset() immediately')

  timer.tick(1000 - 1)
  puppet.emit('reset', { data: 'testing 2' })
  t.equal(reset.callCount, 1, 'should not call reset() again in the following 1 second')

  timer.tick(1000 + 1)
  puppet.emit('reset', { data: 'testing 2' })
  t.equal(reset.callCount, 2, 'should call reset() again after 1 second')

  sandbox.restore()
})

test('set memory() memory with a name', async t => {
  const puppet = new PuppetTest()
  const memory = new MemoryCard({ name: 'name' })

  t.doesNotThrow(() => puppet.setMemory(memory), 'should not throw when set a named memory first time ')
  t.throws(()       => puppet.setMemory(memory), 'should throw when set a named memory second time')
})

test('messageQueryFilterFactory() one condition', async t => {
  const EXPECTED_TEXT1 = 'text'
  const EXPECTED_TEXT2 = 'regexp'
  const EXPECTED_TEXT3 = 'fdsafasdfsdakljhj;lds'
  const EXPECTED_ID1   = 'id1'

  const TEXT_QUERY_TEXT = EXPECTED_TEXT1
  const TEXT_QUERY_ID   = EXPECTED_ID1
  const TEXT_QUERY_RE = new RegExp(EXPECTED_TEXT2)

  const QUERY_TEXT: MessageQueryFilter = {
    text: TEXT_QUERY_TEXT,
  }

  const QUERY_RE: MessageQueryFilter = {
    text: TEXT_QUERY_RE,
  }

  const QUERY_ID: MessageQueryFilter = {
    id: TEXT_QUERY_ID,
  }

  const PAYLOAD_LIST = [
    {
      id: EXPECTED_ID1,
      text: EXPECTED_TEXT1,
    },
    {
      text: EXPECTED_TEXT2,
    },
    {
      text: EXPECTED_TEXT3,
    },
  ] as MessagePayload[]

  const puppet = new PuppetTest()

  let filterFuncText
  let resultPayload

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TEXT)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 1, 'should get one result')
  t.equal(resultPayload[0]!.text, EXPECTED_TEXT1, 'should get text1')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_RE)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 1, 'should get one result')
  t.equal(resultPayload[0]!.text, EXPECTED_TEXT2, 'should get text2')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_ID)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 1, 'should get one result')
  t.equal(resultPayload[0]!.id, EXPECTED_ID1, 'should get id1')
})

test('messageQueryFilterFactory() two condition', async t => {
  const EXPECTED_TEXT_DATA = 'data'
  const EXPECTED_TEXT_LINK = 'https://google.com'

  const EXPECTED_TYPE_URL = MessageType.Url
  const EXPECTED_TYPE_TEXT = MessageType.Text

  const QUERY_TEXT: MessageQueryFilter = {
    text: EXPECTED_TEXT_DATA,
  }

  const QUERY_TYPE: MessageQueryFilter = {
    type: EXPECTED_TYPE_URL,
  }

  const QUERY_TYPE_TEXT: MessageQueryFilter = {
    text: EXPECTED_TEXT_DATA,
    type: EXPECTED_TYPE_URL,
  }

  const PAYLOAD_LIST = [
    {
      text: EXPECTED_TEXT_DATA,
      type: MessageType.Text,
    },
    {
      text: EXPECTED_TEXT_DATA,
      type: MessageType.Url,
    },
    {
      text: EXPECTED_TEXT_LINK,
      type: MessageType.Text,
    },
    {
      text: EXPECTED_TEXT_LINK,
      type: MessageType.Url,
    },
  ] as MessagePayload[]

  const puppet = new PuppetTest()

  let filterFuncText
  let resultPayload

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TEXT)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 2, 'should get two result')
  t.equal(resultPayload[0]!.text, EXPECTED_TEXT_DATA, 'should get text data')
  t.equal(resultPayload[0]!.type, EXPECTED_TYPE_TEXT, 'should get type text')
  t.equal(resultPayload[1]!.text, EXPECTED_TEXT_DATA, 'should get text data')
  t.equal(resultPayload[1]!.type, EXPECTED_TYPE_URL, 'should get type url')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TYPE)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 2, 'should get two result')
  t.equal(resultPayload[0]!.text, EXPECTED_TEXT_DATA, 'should get text data')
  t.equal(resultPayload[0]!.type, EXPECTED_TYPE_URL, 'should get type url')
  t.equal(resultPayload[1]!.text, EXPECTED_TEXT_LINK, 'should get text link')
  t.equal(resultPayload[1]!.type, EXPECTED_TYPE_URL, 'should get type url ')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TYPE_TEXT)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 1, 'should get one result')
  t.equal(resultPayload[0]!.text, EXPECTED_TEXT_DATA, 'should get text data')
  t.equal(resultPayload[0]!.type, EXPECTED_TYPE_URL, 'should get type url')
})

test('name()', async t => {
  const puppet = new PuppetTest()

  const name = puppet.name()
  const EXPECTED_NAME = 'puppet-test'

  t.equal(name, EXPECTED_NAME, 'should get the child class package name')
})

test('version()', async t => {
  const puppet = new PuppetTest()

  const version = puppet.version()
  const EXPECTED_VERSION = '1.0.0'

  t.equal(version, EXPECTED_VERSION, 'should get the child class package version')
})

test('PuppetSkeleton: super.{start,stop}()', async t => {
  const sandbox = sinon.createSandbox()

  const startStub = sandbox.stub(PuppetSkeleton.prototype, 'start').resolves()
  const stopStub  = sandbox.stub(PuppetSkeleton.prototype, 'stop').resolves()

  const puppet = new PuppetTest()
  t.notOk(startStub.called, 'should init start flag with false')
  t.notOk(stopStub.called, 'should init stop flag with false')

  await puppet.start()
  t.ok(startStub.called, 'should call the skeleton start(), which means all mixin start()s are chained correctly')
  t.notOk(stopStub.called, 'should keep stop flag with false')

  await puppet.stop()
  t.ok(startStub.called, 'should keep start flag with true')
  t.ok(stopStub.called, 'should call the skeleton stop(), which means all mixin stops()s are chained correctly')

  sandbox.restore()
})
