/**
 * Unit tests for `puppet-abstract.ts`.
 */
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import {
  MemoryCard,
}                 from '../config.ts'

import {
  ContactGender,
  type ContactPayload,
  ContactType,
}                                 from '../schemas/contact.ts'
import {
  type MessagePayload,
  type MessageQueryFilter,
  MessageType,
}                                 from '../schemas/message.ts'
import type {
  RoomPayload,
}                                 from '../schemas/room.ts'

import * as PUPPET from '../mods/mod.ts'
import { LifecycleUnsafeStateError } from 'scopelet'
import { PuppetSkeleton } from './puppet-skeleton.ts'

/**
 * The Fixture
 */
import {
  PuppetTest,
}               from '../../tests/fixtures/puppet-test/puppet-test.ts'

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

  void await t.test('filter name by regex', async _t => {
    const QUERY   = { name: REGEX_VALUE }
    const ID_LIST = [ 'id1', 'id3' ]

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter the query to id list')
  })

  void await t.test('filter name by text', async _t => {
    const QUERY = { name: TEXT_VALUE }
    const ID_LIST = [ 'id2', 'id4' ]

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  void await t.test('filter alias by regex', async _t => {
    const QUERY = { alias: REGEX_VALUE }
    const ID_LIST = [ 'id2', 'id4' ]

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  void await t.test('filter alias by text', async _t => {
    const QUERY = { alias: TEXT_VALUE }
    const ID_LIST = [ 'id1', 'id3' ]

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  void await t.test('filter contact existing id', async _t => {
    const QUERY = { id: 'id1' }
    const ID_LIST = [ 'id1' ]

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter query to id list by id')
  })

  void await t.test('filter contact non-existing id', async _t => {
    const QUERY = { id: 'fasdfsdfasfas' }
    const ID_LIST = [] as string[]

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter query to id list by id')
  })

  void await t.test('throw if filter key unknown', async _t => {
    assert.throws(() => puppet.contactQueryFilterFactory({ xxxx: 'test' } as any), 'should throw')
  })

  void await t.test('throw if filter key are more than one', async _t => {
    assert.throws(() => puppet.contactQueryFilterFactory({
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

  void await t.test('filter name by regex', async _t => {
    const QUERY   = { topic: REGEX_VALUE }
    const ID_LIST = [ 'id2', 'id4' ]

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter the query to id list')
  })

  void await t.test('filter name by text', async _t => {
    const QUERY = { topic: TEXT_VALUE }
    const ID_LIST = [ 'id1', 'id3' ]

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter query to id list by text')
  })

  void await t.test('filter name by existing id', async _t => {
    const QUERY = { id: 'id4' }
    const ID_LIST = [ 'id4' ]

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter query to id list by id')
  })

  void await t.test('filter name by non-existing id', async _t => {
    const QUERY = { id: 'fsdfasfasfsdfsaf' }
    const ID_LIST = [] as string[]

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    assert.deepEqual(idList, ID_LIST, 'should filter query to id list by id')
  })

  void await t.test('throw if filter key unknown', async _t => {
    assert.throws(() => puppet.roomQueryFilterFactory({ xxx: 'test' } as any), 'should throw')
  })

  void await t.test('throw if filter key are more than one', async _t => {
    assert.throws(() => puppet.roomQueryFilterFactory({
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

//   assert.deepEqual(roomIdList1, [ROOM_ID_1], 'should get room 1 for contact 1')
//   assert.deepEqual(roomIdList2, [ROOM_ID_1, ROOM_ID_2], 'should get room 1&2 for contact 2')
//   assert.deepEqual(roomIdList3, [ROOM_ID_2], 'should get room 2 for contact 3')
// })

/**
 * Huan(202110): the reset logic has been refactored
 *  See: reset() method and 'reset' event breaking change #157
 *    https://github.com/wechaty/puppet/issues/157
 */
test.skip('reset event throttle for reset()', async _t => {
  const puppet = new PuppetTest({})

  mock.timers.enable({ apis: [ 'setTimeout', 'setInterval', 'Date' ] })
  const reset = mock.method(puppet as any, 'reset', () => {})
  await puppet.start()

  puppet.emit('reset', { data: 'testing' })
  assert.equal(reset.mock.callCount(), 1, 'should call reset() immediately')

  mock.timers.tick(1000 - 1)
  puppet.emit('reset', { data: 'testing 2' })
  assert.equal(reset.mock.callCount(), 1, 'should not call reset() again in the following 1 second')

  mock.timers.tick(1000 + 1)
  puppet.emit('reset', { data: 'testing 2' })
  assert.equal(reset.mock.callCount(), 2, 'should call reset() again after 1 second')

  mock.restoreAll()
  mock.timers.reset()
})

test('set memory() memory with a name', async _t => {
  const puppet = new PuppetTest()
  const memory = new MemoryCard({ name: 'name' })

  assert.doesNotThrow(() => puppet.setMemory(memory), 'should not throw when set a named memory first time ')
  assert.throws(()       => puppet.setMemory(memory), 'should throw when set a named memory second time')
})

test('messageQueryFilterFactory() one condition', async _t => {
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
  assert.equal(resultPayload.length, 1, 'should get one result')
  assert.equal(resultPayload[0]!.text, EXPECTED_TEXT1, 'should get text1')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_RE)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  assert.equal(resultPayload.length, 1, 'should get one result')
  assert.equal(resultPayload[0]!.text, EXPECTED_TEXT2, 'should get text2')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_ID)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  assert.equal(resultPayload.length, 1, 'should get one result')
  assert.equal(resultPayload[0]!.id, EXPECTED_ID1, 'should get id1')
})

test('messageQueryFilterFactory() two condition', async _t => {
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
  assert.equal(resultPayload.length, 2, 'should get two result')
  assert.equal(resultPayload[0]!.text, EXPECTED_TEXT_DATA, 'should get text data')
  assert.equal(resultPayload[0]!.type, EXPECTED_TYPE_TEXT, 'should get type text')
  assert.equal(resultPayload[1]!.text, EXPECTED_TEXT_DATA, 'should get text data')
  assert.equal(resultPayload[1]!.type, EXPECTED_TYPE_URL, 'should get type url')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TYPE)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  assert.equal(resultPayload.length, 2, 'should get two result')
  assert.equal(resultPayload[0]!.text, EXPECTED_TEXT_DATA, 'should get text data')
  assert.equal(resultPayload[0]!.type, EXPECTED_TYPE_URL, 'should get type url')
  assert.equal(resultPayload[1]!.text, EXPECTED_TEXT_LINK, 'should get text link')
  assert.equal(resultPayload[1]!.type, EXPECTED_TYPE_URL, 'should get type url ')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TYPE_TEXT)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  assert.equal(resultPayload.length, 1, 'should get one result')
  assert.equal(resultPayload[0]!.text, EXPECTED_TEXT_DATA, 'should get text data')
  assert.equal(resultPayload[0]!.type, EXPECTED_TYPE_URL, 'should get type url')
})

test('name()', async _t => {
  const puppet = new PuppetTest()

  const name = puppet.name()
  const EXPECTED_NAME = 'puppet-test'

  assert.equal(name, EXPECTED_NAME, 'should get the child class package name')
})

test('version()', async _t => {
  const puppet = new PuppetTest()

  const version = puppet.version()
  const EXPECTED_VERSION = '1.0.0'

  assert.equal(version, EXPECTED_VERSION, 'should get the child class package version')
})

test('PuppetSkeleton: super.{start,stop}()', async _t => {
  const startStub = mock.method(PuppetSkeleton.prototype, 'start', async () => {})
  const stopStub  = mock.method(PuppetSkeleton.prototype, 'stop', async () => {})

  const puppet = new PuppetTest()
  assert.ok(startStub.mock.callCount() === 0, 'should init start flag with false')
  assert.ok(stopStub.mock.callCount() === 0, 'should init stop flag with false')

  await puppet.start()
  assert.ok(startStub.mock.callCount() > 0, 'should call the skeleton start(), which means all mixin start()s are chained correctly')
  assert.ok(stopStub.mock.callCount() === 0, 'should keep stop flag with false')

  await puppet.stop()
  assert.ok(startStub.mock.callCount() > 0, 'should keep start flag with true')
  assert.ok(stopStub.mock.callCount() > 0, 'should call the skeleton stop(), which means all mixin stops()s are chained correctly')

  mock.restoreAll()
})

test('payload retrieval and caching for contacts, rooms, friendships, messages, posts, invitations', async _t => {
  const puppet = new PuppetTest()

  // Contact payload
  assert.equal(puppet.contactPayloadCache('c1'), undefined)
  const contact = await puppet.contactPayload('c1')
  assert.ok(contact)
  assert.equal(puppet.contactPayloadCache('c1'), contact)

  // Room payload
  assert.equal(puppet.roomPayloadCache('r1'), undefined)
  const room = await puppet.roomPayload('r1')
  assert.ok(room)
  assert.equal(puppet.roomPayloadCache('r1'), room)

  // Room member payload
  const member = await puppet.roomMemberPayload('r1', 'm1')
  assert.ok(member)

  // Friendship payload
  assert.equal(puppet.friendshipPayloadCache('f1'), undefined)
  const friendship = await puppet.friendshipPayload('f1')
  assert.ok(friendship)
  assert.equal(puppet.friendshipPayloadCache('f1'), friendship)

  // Room invitation payload
  assert.equal(puppet.roomInvitationPayloadCache('i1'), undefined)
  const invitation = await puppet.roomInvitationPayload('i1')
  assert.ok(invitation)
  await puppet.roomInvitationPayload('i1', invitation)
  assert.equal(puppet.roomInvitationPayloadCache('i1'), invitation)

  // Message payload
  assert.equal(puppet.messagePayloadCache('m1'), undefined)
  const message = await puppet.messagePayload('m1')
  assert.ok(message)
  assert.equal(puppet.messagePayloadCache('m1'), message)

  // Post payload
  assert.equal(puppet.postPayloadCache('p1'), undefined)
  const post = await puppet.postPayload('p1')
  assert.ok(post)
  assert.equal(puppet.postPayloadCache('p1'), post)
})

test('validations, dirty cache invalidation, and helpers', async _t => {
  const puppet = new PuppetTest()

  assert.equal(await puppet.contactValidate('c1'), true)
  assert.equal(await puppet.roomValidate('r1'), true)
  assert.equal(puppet.wechatyVersionRange(), '*')
  assert.equal(puppet.wechatyVersionRange(true), '^0.16.0')
  assert.match(puppet.toString(), /^Puppet<PuppetTest>\(/)

  // Test dirty cache invalidation
  await puppet.contactPayload('c1')
  assert.ok(puppet.contactPayloadCache('c1'))
  puppet.onDirty({ payloadId: 'c1', payloadType: PUPPET.types.Dirty.Contact })
  assert.equal(puppet.contactPayloadCache('c1'), undefined)

  await puppet.roomPayload('r1')
  assert.ok(puppet.roomPayloadCache('r1'))
  puppet.onDirty({ payloadId: 'r1', payloadType: PUPPET.types.Dirty.Room })
  assert.equal(puppet.roomPayloadCache('r1'), undefined)

  await puppet.friendshipPayload('f1')
  assert.ok(puppet.friendshipPayloadCache('f1'))
  puppet.onDirty({ payloadId: 'f1', payloadType: PUPPET.types.Dirty.Friendship })
  assert.equal(puppet.friendshipPayloadCache('f1'), undefined)

  await puppet.messagePayload('m1')
  assert.ok(puppet.messagePayloadCache('m1'))
  puppet.onDirty({ payloadId: 'm1', payloadType: PUPPET.types.Dirty.Message })
  assert.equal(puppet.messagePayloadCache('m1'), undefined)

  await puppet.postPayload('p1')
  assert.ok(puppet.postPayloadCache('p1'))
  puppet.onDirty({ payloadId: 'p1', payloadType: PUPPET.types.Dirty.Post })
  assert.equal(puppet.postPayloadCache('p1'), undefined)

  // Puppet static validation
  assert.ok(PUPPET.Puppet.valid(puppet))
  assert.ok(PUPPET.Puppet.validInstance(puppet))
  assert.ok(PUPPET.Puppet.validInterface(puppet))
  assert.equal(PUPPET.Puppet.valid({}), false)
})

test('sayablePayload() and messageSend() conversions', async _t => {
  const puppet = new PuppetTest()

  // sayablePayload
  mock.method(puppet, 'messagePayload', async () => ({
    id: 'm1',
    type: PUPPET.types.Message.Text,
    text: 'hello world',
  }))
  const sayable = await puppet.sayablePayload('m1')
  assert.ok(sayable)
  assert.equal(sayable.type, PUPPET.types.Sayable.Text)

  // messageSend
  const sendResult = await puppet.messageSend('conv1', sayable)
  assert.deepEqual(sendResult, { conversationId: 'conv1', text: 'hello world' } as any)
})

test('auth, scan, and login lifecycle', async _t => {
  const puppet = new PuppetTest()

  assert.equal(puppet.isLoggedIn, false)
  assert.equal(puppet.authQrCode, undefined)
  assert.throws(() => puppet.currentUserId, /not logged in/)
  assert.equal(puppet.logonoff(), false)

  await puppet.start()

  // Scan events
  puppet.emit('scan', { qrcode: 'https://qrcode.com', status: PUPPET.types.ScanStatus.Waiting })
  assert.equal(puppet.authQrCode, 'https://qrcode.com')

  puppet.emit('scan', { qrcode: '', status: PUPPET.types.ScanStatus.Confirmed })
  assert.equal(puppet.authQrCode, undefined)

  puppet.emit('scan', { qrcode: 'https://timeout.com', status: PUPPET.types.ScanStatus.Timeout })
  assert.equal(puppet.authQrCode, 'https://timeout.com')

  puppet.emit('scan', { qrcode: '', status: PUPPET.types.ScanStatus.Cancel })
  assert.equal(puppet.authQrCode, undefined)

  puppet.emit('scan', { qrcode: '', status: PUPPET.types.ScanStatus.Scanned })
  assert.equal(puppet.authQrCode, undefined)

  puppet.emit('scan', { qrcode: '', status: PUPPET.types.ScanStatus.Unknown })
  assert.equal(puppet.authQrCode, undefined)

  // Login
  puppet.login('user-123')
  assert.equal(puppet.isLoggedIn, true)
  assert.equal(puppet.currentUserId, 'user-123')
  assert.equal(puppet.selfId(), 'user-123')
  assert.equal(puppet.logonoff(), true)
  assert.throws(() => puppet.login('user-456'), /must logout first/)

  // Idempotent start
  await puppet.start()

  // Logout
  await puppet.logout()
  assert.equal(puppet.isLoggedIn, false)

  // Idempotent logout
  await puppet.logout()

  await puppet.stop()
  // Idempotent stop
  await puppet.stop()

  // Reset when inactive
  await puppet.reset()
})

test('searches for contacts, room members, rooms, and friendships', async _t => {
  const puppet = new PuppetTest()

  mock.method(puppet, 'contactList', async () => ['c1', 'c2'])
  mock.method(puppet, 'contactPayload', async (id: string) => {
    if (id === 'non-existent') {
      throw new Error('not found')
    }
    return {
      id,
      name: id === 'c1' ? 'Alice' : 'Bob',
      alias: id === 'c1' ? 'Ally' : 'Bobby',
      gender: ContactGender.Unknown,
      type: ContactType.Individual,
      phone: [],
      avatar: 'avatar',
    }
  })

  // Contact search by string
  const foundByName = await puppet.contactSearch('Alice')
  assert.deepEqual(foundByName, ['c1'])

  // Contact search with explicit searchIdList and undefined query
  const foundWithExplicitList = await puppet.contactSearch('Alice', ['c1', 'c2'])
  assert.deepEqual(foundWithExplicitList, ['c1'])
  const allContacts = await puppet.contactSearch()
  assert.deepEqual(allContacts, ['c1', 'c2'])

  // Contact search by id
  const foundById = await puppet.contactSearch({ id: 'c1' })
  assert.deepEqual(foundById, ['c1'])

  const notFoundContact = await puppet.contactSearch({ id: 'non-existent' })
  assert.deepEqual(notFoundContact, [])

  // Contact filter factory with weixin
  const wxFilter = puppet.contactQueryFilterFactory({ weixin: 'alice_wx' })
  assert.equal(typeof wxFilter, 'function')

  // Room search by id
  mock.method(puppet, 'roomPayload', async (id: string) => {
    if (id === 'non-existent') {
      throw new Error('not found')
    }
    return {
      id,
      topic: 'Test Topic',
      adminIdList: [],
      memberIdList: ['c1', 'c2'],
    }
  })
  mock.method(puppet, 'roomList', async () => ['r1'])
  const foundRoomById = await puppet.roomSearch({ id: 'r1' })
  assert.deepEqual(foundRoomById, ['r1'])

  const notFoundRoom = await puppet.roomSearch({ id: 'non-existent' })
  assert.deepEqual(notFoundRoom, [])

  // Room search with undefined query and regex topic
  const allRooms = await puppet.roomSearch()
  assert.deepEqual(allRooms, ['r1'])
  const roomByRegex = await puppet.roomSearch({ topic: /Test/ })
  assert.deepEqual(roomByRegex, ['r1'])

  // Room member search
  puppet.login('c1')
  mock.method(puppet, 'roomMemberList', async () => ['c1', 'c2'])
  mock.method(puppet, 'roomMemberPayload', async (roomId: string, memberId: string) => ({
    id: memberId,
    roomId,
    name: memberId === 'c1' ? 'Alice' : 'Bob',
    roomAlias: memberId === 'c1' ? 'Chief' : 'Member',
    avatar: 'avatar',
  }))

  const foundYou = await puppet.roomMemberSearch('r1', PUPPET.types.YOU)
  assert.deepEqual(foundYou, ['c1'])

  const foundMemberByAlias = await puppet.roomMemberSearch('r1', { roomAlias: 'Chief' })
  assert.deepEqual(foundMemberByAlias, ['c1'])

  const foundMemberByName = await puppet.roomMemberSearch('r1', { name: 'Alice' })
  assert.deepEqual(foundMemberByName, ['c1'])

  // Room member search with explicit memberIdList and text
  const foundMemberByText = await puppet.roomMemberSearch('r1', 'Alice', ['c1', 'c2'])
  assert.deepEqual(foundMemberByText, ['c1'])

  await assert.rejects(async () => puppet.roomMemberSearch('r1', Symbol('unknown')), /unknown symbol/)

  // Friendship search
  assert.equal(await puppet.friendshipSearch({ phone: '12345' }), '12345')
  assert.equal(await puppet.friendshipSearch({ handle: 'weixin_handle' }), 'weixin_handle')
  assert.equal(await puppet.friendshipSearch({ weixin: 'weixin_handle' }), 'weixin_handle')
  await assert.rejects(async () => puppet.friendshipSearch({} as any), /should only include one key/)

  // Lists
  assert.ok(Array.isArray(puppet.messageList()))
  assert.ok(Array.isArray(puppet.postList()))

  // Message search by id, empty query, and regex
  mock.method(puppet, 'messagePayload', async (id: string) => {
    if (id === 'm-not-found') {
      throw new Error('not found')
    }
    return { id, type: MessageType.Text, text: 'hello' } as any
  })
  assert.deepEqual(await puppet.messageSearch({ id: 'm1' }), ['m1'])
  assert.deepEqual(await puppet.messageSearch({ id: 'm-not-found' }), [])
  assert.ok(Array.isArray(await puppet.messageSearch()))
  assert.ok(Array.isArray(await puppet.messageSearch({ text: /hello/ })))
})

test('sayablePayload() and messageSend() for all sayable variants', async _t => {
  const puppet = new PuppetTest()

  // Sayable variants
  mock.method(puppet, 'messagePayload', async (id: string) => {
    switch (id) {
      case 'm-contact':
        return { id, type: PUPPET.types.Message.Contact }
      case 'm-location':
        return { id, type: PUPPET.types.Message.Location }
      case 'm-url':
        return { id, type: PUPPET.types.Message.Url }
      case 'm-mini':
        return { id, type: PUPPET.types.Message.MiniProgram }
      case 'm-post':
        return { id, type: PUPPET.types.Message.Post }
      case 'm-image':
        return { id, type: PUPPET.types.Message.Image }
      default:
        return { id, type: PUPPET.types.Message.Unknown }
    }
  })
  mock.method(puppet, 'messageContact', async () => 'c1')
  mock.method(puppet, 'messageLocation', async () => ({ address: 'Beijing' } as any))
  mock.method(puppet, 'messageUrl', async () => ({ url: 'https://wechaty.js.org' } as any))
  mock.method(puppet, 'messageMiniProgram', async () => ({ appid: 'mini1' } as any))
  mock.method(puppet, 'postPayload', async () => ({ id: 'p1' } as any))
  mock.method(puppet, 'messageFile', async () => ({ name: 'test.png' } as any))

  const sContact = await puppet.sayablePayload('m-contact')
  assert.equal(sContact?.type, PUPPET.types.Sayable.Contact)

  const sLocation = await puppet.sayablePayload('m-location')
  assert.equal(sLocation?.type, PUPPET.types.Sayable.Location)

  const sUrl = await puppet.sayablePayload('m-url')
  assert.equal(sUrl?.type, PUPPET.types.Sayable.Url)

  const sMini = await puppet.sayablePayload('m-mini')
  assert.equal(sMini?.type, PUPPET.types.Sayable.MiniProgram)

  const sPost = await puppet.sayablePayload('m-post')
  assert.equal(sPost?.type, PUPPET.types.Sayable.Post)

  const sImage = await puppet.sayablePayload('m-image')
  assert.equal(sImage?.type, PUPPET.types.Sayable.Attachment)

  const sUnknown = await puppet.sayablePayload('m-unknown')
  assert.equal(sUnknown, undefined)

  // messageSend variants
  assert.ok(await puppet.messageSend('conv1', sContact!))
  assert.ok(await puppet.messageSend('conv1', sLocation!))
  assert.ok(await puppet.messageSend('conv1', sUrl!))
  assert.ok(await puppet.messageSend('conv1', sMini!))
  assert.ok(await puppet.messageSend('conv1', sPost!))

  // Audio / Video / Emoticon sayablePayload
  for (const type of [PUPPET.types.Message.Audio, PUPPET.types.Message.Video, PUPPET.types.Message.Emoticon]) {
    mock.method(puppet, 'messagePayload', async () => ({ id: 'm-media', type }))
    const sMedia = await puppet.sayablePayload('m-media')
    assert.equal(sMedia?.type, PUPPET.types.Sayable.Attachment)
  }
})

test('dirty Unspecified and start/stop failure handling', async _t => {
  const puppet = new PuppetTest()
  assert.throws(() => puppet.onDirty({ payloadId: 'x', payloadType: PUPPET.types.Dirty.Unspecified }), /Unspecified type/)

  // Test start exception handling
  const failingPuppet = new PuppetTest()
  mock.method(failingPuppet, 'onStart', async () => {
    throw new Error('boom onStart')
  })
  await assert.rejects(async () => failingPuppet.start(), /boom onStart/)
  assert.equal(failingPuppet.state.inactive(), true)

  // Test stop exception handling
  const failingStopPuppet = new PuppetTest()
  failingStopPuppet.on('error', () => {})
  await failingStopPuppet.start()
  mock.method(failingStopPuppet, 'onStop', async () => {
    throw new Error('boom onStop')
  })
  await failingStopPuppet.stop()
  assert.equal(failingStopPuppet.state.inactive(), true)
})

test('start() failure teardown, error identity without error listeners, and retry safety', async _t => {
  const puppet = new PuppetTest()
  let attempts = 0
  mock.method(puppet, 'onStart', async () => {
    attempts++
    if (attempts === 1) {
      throw new Error('boom onStart')
    }
  })

  // 1. Verify exact error thrown without wrapping in unhandled error
  await assert.rejects(async () => puppet.start(), (err: any) => {
    assert.equal(err.message, 'boom onStart')
    return true
  })

  // 2. State settles to inactive/failed with complete cleanup
  assert.equal(puppet.state.inactive(), true)
  assert.equal((puppet.state as any).kind, 'failed')
  assert.equal(puppet.authQrCode, undefined)
  assert.equal(puppet.isLoggedIn, false)

  // 3. Retry start succeeds cleanly without duplicate listeners or leaked resources
  await puppet.start()
  assert.equal((puppet.state as any).kind, 'running')

  // 4. Test restart and reset
  await puppet.restart()
  assert.equal((puppet.state as any).kind, 'running')

  await puppet.reset('watchdog test')
  assert.equal((puppet.state as any).kind, 'running')

  await puppet.stop()
  assert.equal((puppet.state as any).kind, 'stopped')
})

test('Symbol.asyncDispose stops puppet when leaving scope', async _t => {
  const puppet = new PuppetTest()
  {
    await using p = puppet
    await p.start()
    assert.equal(p.state.active(), true)
  }
  assert.equal(puppet.state.inactive(), true)
})

test('roomMemberPayload caches by memberId and stop() resets authQrCode', async _t => {
  const puppet = new PuppetTest()
  await puppet.start()

  // Verify roomMemberPayload caching by memberId
  mock.method(puppet, 'roomMemberRawPayload', async () => ({ id: 'c1', name: 'Member One' }))
  mock.method(puppet, 'roomMemberRawPayloadParser', async (raw: any) => ({
    avatar: 'avatar1',
    id: raw.id,
    name: raw.name,
  }))

  const memberPayload = await puppet.roomMemberPayload('room1', 'c1')
  assert.equal(memberPayload.name, 'Member One')
  const cached = puppet.cache.roomMember.get('room1')
  assert.deepEqual(cached?.['c1'], memberPayload, 'roomMember cache should hit using computed memberId key')

  // Verify authQrCode set via scan and reset on stop()
  puppet.emit('scan', { qrcode: 'https://login-qrcode', status: PUPPET.types.ScanStatus.Waiting })
  assert.equal(puppet.authQrCode, 'https://login-qrcode')
  await puppet.stop()
  assert.equal(puppet.authQrCode, undefined, 'authQrCode must be cleared after stop()')
})

test('stop-time logout event fires, clears currentUserId, and allows subsequent login', async _t => {
  const puppet = new PuppetTest()
  await puppet.start()

  let logoutFired = false
  let logoutContactId: string | undefined
  puppet.on('logout', (payload: any) => {
    logoutFired = true
    logoutContactId = payload?.contactId ?? payload?.detail?.contactId
  })

  puppet.login('user-123')
  assert.equal(puppet.isLoggedIn, true)
  assert.equal(puppet.currentUserId, 'user-123')

  await puppet.stop()

  assert.equal(logoutFired, true, 'logout event must fire on stop()')
  assert.equal(logoutContactId, 'user-123', 'logout event must have contactId')
  assert.equal(puppet.isLoggedIn, false, 'isLoggedIn must be false after stop()')
  assert.equal(puppet.__currentUserId, undefined, '__currentUserId must be cleared after stop()')

  // Subsequent start allows login without error
  await puppet.start()
  assert.doesNotThrow(() => puppet.login('user-456'), 'subsequent start allows login without throwing')
  assert.equal(puppet.isLoggedIn, true)
  assert.equal(puppet.currentUserId, 'user-456')
  await puppet.stop()
})

test('logout() listener observes isLoggedIn === true and currentUserId during dispatch, and false after settlement', async _t => {
  const puppet = new PuppetTest()
  await puppet.start()
  puppet.login('user-observer')

  let listenerSawLoggedIn: boolean | undefined
  let listenerSawUserId: string | undefined

  puppet.on('logout', (payload: any) => {
    listenerSawLoggedIn = puppet.isLoggedIn
    listenerSawUserId = puppet.currentUserId
    assert.equal(payload?.contactId ?? payload?.detail?.contactId, 'user-observer')
  })

  await puppet.logout('user requested')

  assert.equal(listenerSawLoggedIn, true, 'isLoggedIn must remain true during synchronous logout event dispatch')
  assert.equal(listenerSawUserId, 'user-observer', 'currentUserId must remain defined during synchronous logout event dispatch')
  assert.equal(puppet.isLoggedIn, false, 'isLoggedIn must become false after logout settles')
  assert.equal(puppet.__currentUserId, undefined, '__currentUserId must become undefined after logout settles')
  assert.throws(() => puppet.currentUserId, /not logged in/)

  await puppet.stop()
})

test('puppet.isLoggedIn is true inside onStop() and stop-time logout listener', async _t => {
  let onStopSawLoggedIn: boolean | undefined
  let onStopSawUserId: string | undefined
  let logoutSawLoggedIn: boolean | undefined

  class OnStopCheckingPuppet extends PuppetTest {
    override async onStop (): Promise<void> {
      onStopSawLoggedIn = this.isLoggedIn
      onStopSawUserId = this.currentUserId
    }
  }

  const puppet = new OnStopCheckingPuppet()
  await puppet.start()
  puppet.login('user-onstop')

  puppet.on('logout', () => {
    logoutSawLoggedIn = puppet.isLoggedIn
  })

  await puppet.stop()

  assert.equal(onStopSawLoggedIn, true, 'isLoggedIn must be true inside onStop()')
  assert.equal(onStopSawUserId, 'user-onstop', 'currentUserId must be defined inside onStop()')
  assert.equal(logoutSawLoggedIn, true, 'isLoggedIn must be true inside stop-time logout listener')
  assert.equal(puppet.isLoggedIn, false, 'isLoggedIn must be false after stop completes')
})

test('concurrent logout() and stop() dispatches logout exactly once without duplicates', async _t => {
  const puppet = new PuppetTest()
  await puppet.start()
  puppet.login('user-unique')

  let logoutCount = 0
  puppet.on('logout', () => {
    logoutCount++
  })

  // Trigger logout and stop concurrently
  await Promise.all([
    puppet.logout('user requested'),
    puppet.stop(),
  ])

  assert.equal(logoutCount, 1, 'logout event must only fire once')
  assert.equal(puppet.isLoggedIn, false)
})

test('void puppet.logout() followed by await puppet.stop() clears login state and allows login on next start', async _t => {
  const puppet = new PuppetTest()
  await puppet.start()
  puppet.login('user-fast-stop')

  // void logout and immediately stop in microtasks before setTimeout settles
  void puppet.logout('fast stop')
  await puppet.stop()

  assert.equal(puppet.isLoggedIn, false, 'puppet must be logged out after stop')
  assert.equal(puppet.__currentUserId, undefined, '__currentUserId must be cleared after stop')
  assert.throws(() => puppet.currentUserId, /not logged in/)

  // Subsequent start allows login without error
  await puppet.start()
  assert.doesNotThrow(() => puppet.login('user-fresh'), 'subsequent start allows login without throwing')
  assert.equal(puppet.isLoggedIn, true)
  assert.equal(puppet.currentUserId, 'user-fresh')
  await puppet.stop()
})

test('void puppet.logout() followed by await puppet.restart() clears login state and allows login', async _t => {
  const puppet = new PuppetTest()
  await puppet.start()
  puppet.login('user-fast-restart')

  void puppet.logout('fast restart')
  await puppet.restart()

  assert.equal(puppet.isLoggedIn, false, 'puppet must be logged out after restart')
  assert.equal(puppet.__currentUserId, undefined, '__currentUserId must be cleared after restart')
  assert.doesNotThrow(() => puppet.login('user-restarted'), 'restarted puppet allows clean login')
  assert.equal(puppet.isLoggedIn, true)
  await puppet.stop()
})

test('provider-emitted logout event followed by re-login does not wipe login or ready state', async _t => {
  const puppet = new PuppetTest()
  await puppet.start()
  puppet.login('user-prov-1')
  puppet.readyIndicator.value(true)

  // Provider emits logout directly
  puppet.emit('logout', { contactId: 'user-prov-1', data: 'session expired' })
  await new Promise<void>(resolve => setTimeout(resolve, 10))

  assert.equal(puppet.isLoggedIn, false, 'isLoggedIn must become false after provider logout settles')
  assert.equal(puppet.__currentUserId, undefined, 'currentUserId must be cleared after provider logout settles')

  // Re-login with new user
  puppet.login('user-prov-2')
  puppet.readyIndicator.value(true)

  // Wait for timers in next tick
  await new Promise<void>(resolve => setTimeout(resolve, 50))

  assert.equal(puppet.isLoggedIn, true, 'isLoggedIn must remain true after re-login')
  assert.equal(puppet.currentUserId, 'user-prov-2', 'currentUserId must reflect the new login')
  assert.equal(puppet.readyIndicator.value(), true, 'readyIndicator must remain true after re-login')

  await puppet.stop()
})

test('stop-while-starting (padlocal#116) triggers onStop and settles start cleanly', async _t => {
  let onStopCalled = false
  const stopped = Promise.withResolvers<void>()

  class HangingStartPuppet extends PuppetTest {
    override async onStart (): Promise<void> {
      // Hangs until onStop is called (padlocal#116 pattern)
      await stopped.promise
    }
    override async onStop (): Promise<void> {
      onStopCalled = true
      stopped.resolve()
    }
  }

  const puppet = new HangingStartPuppet()
  const startPromise = puppet.start()
  const startRejection = assert.rejects(startPromise, /LifecycleSupersededError/)

  // Give start a microtick to enter onStart
  await new Promise<void>(resolve => setTimeout(resolve, 50))
  assert.equal(puppet.state.kind, 'starting')

  // Stop while starting
  await puppet.stop()
  await startRejection

  assert.equal(onStopCalled, true, 'onStop must be called when stopped during startup')
  assert.equal(puppet.state.inactive(), true, 'puppet must be inactive after stop')
})

test('inactive reset does not start puppet', async _t => {
  const puppet = new PuppetTest()
  assert.equal(puppet.state.inactive(), true)

  await puppet.reset('reset inactive')
  assert.equal(puppet.state.inactive(), true, 'reset on inactive puppet must not start it')
  assert.equal((puppet.state as any).kind, 'stopped')
})

test('executeOperation drains in-flight work on retirement and runs cleanly', async _t => {
  const puppet = new PuppetTest()
  await puppet.start()

  let workCompleted = false
  let signalObserved: AbortSignal | undefined

  const opPromise = puppet.executeOperation(async signal => {
    signalObserved = signal
    await new Promise<void>(resolve => setTimeout(resolve, 50))
    workCompleted = true
    return 'done'
  })

  // Concurrently stop while operation is in-flight
  await puppet.stop()
  const result = await opPromise

  assert.equal(result, 'done')
  assert.equal(workCompleted, true, 'in-flight operation must complete before stop returns')
  assert.ok(signalObserved?.aborted, 'operation signal should be aborted during retirement')
})

test('cross-generation ready condition wait binds to next generation', async _t => {
  const puppet = new PuppetTest()
  assert.equal(puppet.state.inactive(), true)

  let readyResolved = false
  const readyFuture = puppet.ready().then(() => {
    readyResolved = true
  })

  assert.equal(readyResolved, false, 'ready future must not resolve before start')

  await puppet.start()
  puppet.emit('ready')
  await readyFuture

  assert.equal(readyResolved, true, 'ready future should resolve when started generation emits ready')
  await puppet.stop()
})

test('operation() returns a rejected promise when puppet is idle', async () => {
  const puppet = new PuppetTest()
  assert.equal(puppet.state.kind, 'stopped')

  // Calling operation() when not running must return a Promise rejecting with LifecycleUnsafeStateError
  // rather than throwing synchronously, allowing non-async callers to chain .catch() safely.
  let rejected = false
  const p = puppet.operation(async () => 'not executed').catch(err => {
    rejected = true
    assert.ok(err instanceof LifecycleUnsafeStateError)
  })

  await p
  assert.equal(rejected, true, 'operation() promise must reject with LifecycleUnsafeStateError when idle')
})




