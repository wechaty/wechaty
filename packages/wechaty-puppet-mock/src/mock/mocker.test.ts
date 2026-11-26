/**
 * Unit tests for `mocker.ts`.
 */
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import * as PUPPET  from 'wechaty-puppet'
import {
  FileBox,
}                 from 'file-box'

import { PuppetMock }         from '../puppet-mock.ts'

import type { MessageMock }        from './user/message-mock.ts'
import type { ContactMock }        from './user/contact-mock.ts'

import { Mocker }             from './mocker.ts'
import { SimpleEnvironment }  from './environment.ts'

const sleep = () => new Promise(setImmediate)

class MockerTest extends Mocker {
}

function createFixture () {
  const mocker = new Mocker()
  const puppet = new PuppetMock({ mocker })

  const [user, mike, mary] = mocker.createContacts(3) as [ContactMock, ContactMock, ContactMock]
  const room = mocker.createRoom({
    memberIdList: [
      mike.id,
      mary.id,
      user.id,
    ],
  })

  return {
    mary,
    mike,
    mocker,
    puppet,
    room,
    user,
  }
}

test('Mocker restart without problem', async _t => {
  const mocker = new MockerTest()
  mocker.use(SimpleEnvironment())
  const puppet = new PuppetMock({ mocker })

  try {
    for (let i = 0; i < 3; i++) {
      await mocker.start()
      await mocker.stop()

      await puppet.logout()
      await sleep()

      assert.ok(true, 'start/stop-ed at #' + i)
    }
    assert.ok(true, 'Mocker() start/restart succeed.')
  } catch (e) {
    console.error(e)
    assert.fail('rejection')
  }
})

test('Mocker.scan()', async _t => {
  const {
    mocker,
    puppet,
  }         = createFixture()

  const QR_CODE = 'https://github.com/wechaty'
  const EXPECTED_PAYLOAD: PUPPET.payloads.EventScan = {
    qrcode: QR_CODE,
    status: PUPPET.types.ScanStatus.Waiting,
  }

  const spy = mock.fn()
  puppet.on('scan', spy)

  await puppet.start()
  mocker.scan(QR_CODE, PUPPET.types.ScanStatus.Waiting)

  assert.ok(spy.mock.callCount() === 1, 'should received the scan event')
  assert.deepStrictEqual(spy.mock.calls[0]?.arguments[0], EXPECTED_PAYLOAD, 'should receive the expected QR code')

  await puppet.stop()
})

test('Mocker.login()', async _t => {
  const {
    user,
    mocker,
    puppet,
  }         = createFixture()

  const EXPECTED_PAYLOAD: PUPPET.payloads.EventLogin = {
    contactId: user.id,
  }

  const spy = mock.fn()
  puppet.on('login', spy)

  await puppet.start()
  mocker.login(user)

  assert.ok(spy.mock.callCount() === 1, 'should received the login event')
  assert.deepStrictEqual(spy.mock.calls[0]?.arguments[0], EXPECTED_PAYLOAD, 'should receive the expected login payload')

  await puppet.stop()
})

test('MockContact.say().to(contact)', async _t => {
  const {
    user,
    mary,
    puppet,
  }         = createFixture()

  const TEXT = 'Hello, contact!'

  const future = new Promise<PUPPET.payloads.EventMessage>(resolve => puppet.once('message', resolve))

  await puppet.start()
  user.say(TEXT).to(mary)

  const { messageId } = await future

  const EXPECTED_PAYLOAD: PUPPET.payloads.Message = {
    id         : messageId,
    listenerId : mary.id,
    talkerId   : user.id,
    text       : TEXT,
    timestamp  : Date.now(),
    type       : PUPPET.types.Message.Text,
  }

  const payload = await puppet.messagePayload(messageId)

  EXPECTED_PAYLOAD.timestamp = payload.timestamp

  assert.deepEqual(payload, EXPECTED_PAYLOAD, 'should received the expected text message payload')

  await puppet.stop()
})

test('MockContact.say().to(room)', async _t => {
  const {
    user,
    room,
    puppet,
  }         = createFixture()

  const TEXT = 'Hello, room!'

  const future = new Promise<PUPPET.payloads.EventMessage>(resolve => puppet.once('message', resolve))

  await puppet.start()
  user.say(TEXT).to(room)

  const { messageId } = await future

  const EXPECTED_PAYLOAD: PUPPET.payloads.Message = {
    id            : messageId,
    mentionIdList : [],
    roomId        : room.id,
    talkerId      : user.id,
    text          : TEXT,
    timestamp     : Date.now(),
    type          : PUPPET.types.Message.Text,
  }

  const payload = await puppet.messagePayload(messageId)

  EXPECTED_PAYLOAD.timestamp = payload.timestamp

  assert.deepEqual(payload, EXPECTED_PAYLOAD, 'should received the expected room message payload')

  await puppet.stop()
})

test('event(message) for MockContact & MockRoom', async _t => {
  const {
    user,
    room,
    puppet,
  }         = createFixture()

  const roomSpy = mock.fn()
  const userSpy = mock.fn()

  user.on('message', userSpy)
  room.on('message', roomSpy)

  const TEXT = 'hello'

  try {
    await puppet.start()

    user.say(TEXT).to(room)

    assert.ok(userSpy.mock.callCount() === 1, 'should emit message event on user')
    assert.ok(roomSpy.mock.callCount() === 1, 'should emit message event on room')

    const userMsg = userSpy.mock.calls[0]!.arguments[0] as MessageMock
    const roomMsg = roomSpy.mock.calls[0]!.arguments[0] as MessageMock

    assert.deepEqual(userMsg.payload, roomMsg.payload, 'should receive the same message for both user & room')

    assert.equal(userMsg.payload.text, TEXT, 'should receive the TEXT as the message')
  } finally {
    await puppet.stop()
  }
})

test('Multiple Mockers with their MockContact(s)', async _t => {
  const mocker1 = new Mocker()
  const mocker2 = new Mocker()

  const ID = 'id'

  const contact1 = mocker1.createContact({ id: ID })
  const contact2 = mocker2.createContact({ id: ID })

  assert.notEqual(contact1, contact2, 'should have separate MockContact classes')
  assert.equal(contact1.id, contact2.id, 'should have the same id from different mocker instances')
})

// test.skip('MockContact.say(url).to(contact)', async t => {
//   const {
//     user,
//     mary,
//     puppet,
//   }         = createFixture()

//   const url = new UrlLink({
//     title: 'mock',
//     url: 'http://www.mock.com',
//   })

//   await puppet.start()

//   let receive
//   mary.on('message', async message => {
//     receive = await message.toUrlLink()
//   })

//   user.say(url).to(mary)

//   await sleep()
//   assert.deepEqual(receive, url, 'should received the expected contact message payload')
//   await puppet.stop()
// })

// test('MockContact.say(contact).to(contact)', async t => {
//   const {
//     user,
//     mary,
//     puppet,
//     mike,
//   }         = createFixture()

//   await puppet.start()

//   let receive
//   mary.on('message', async message => {
//     receive = await message.toContact()
//   })

//   user.say(mike).to(mary)

//   await sleep()
//   assert.deepEqual(receive, mike, 'should received the expected contact message payload')
//   await puppet.stop()
// })

test('MockContact.say(fileBox).to(contact) delivers in-memory media', async t => {
  const {
    user,
    mary,
    puppet,
  }         = createFixture()

  await puppet.start()
  t.after(() => puppet.stop())

  const cases = [
    [ 'image.png', PUPPET.types.Message.Image ],
    [ 'photo.jpg', PUPPET.types.Message.Image ],
    [ 'movie.mp4', PUPPET.types.Message.Video ],
    [ 'voice.sil', PUPPET.types.Message.Audio ],
    [ 'file.bin', PUPPET.types.Message.Unknown ],
  ] as const

  for (const [name, type] of cases) {
    const contents = btoa(`Mock contents for ${name}`)
    const fileBox = FileBox.fromBase64(contents, name)
    const incoming = new Promise<MessageMock>(resolve => mary.once('message', resolve))
    user.say(fileBox).to(mary)

    const message = await incoming
    const received = await message.toFileBox()

    assert.equal(message.type(), type, name)
    assert.equal(received.name, name)
    assert.equal(await received.toBase64(), contents)
  }
})

test('MockContact and MockRoom EventTarget addEventListener, next(), and events()', async _t => {
  const {
    user,
    room,
    puppet,
  } = createFixture()

  let userDetail: any = null
  let roomDetail: any = null

  user.addEventListener('message', (event: Event) => {
    if (event instanceof CustomEvent) {
      userDetail = event.detail
    }
  })
  room.addEventListener('message', (event: Event) => {
    if (event instanceof CustomEvent) {
      roomDetail = event.detail
    }
  })

  const userNextPromise = user.next('message')
  const roomNextPromise = room.next('message')

  try {
    await puppet.start()
    const TEXT = 'event-target test'
    user.say(TEXT).to(room)

    const userNextMsg = await userNextPromise
    const roomNextMsg = await roomNextPromise

    assert.equal(userDetail.payload.text, TEXT, 'userDetail should match')
    assert.equal(roomDetail.payload.text, TEXT, 'roomDetail should match')
    assert.equal(userNextMsg.payload.text, TEXT, 'userNextMsg should match')
    assert.equal(roomNextMsg.payload.text, TEXT, 'roomNextMsg should match')
  } finally {
    await puppet.stop()
  }
})

// test.skip('MockContact.say(miniprogram).to(contact)', async t => {
//   const {
//     user,
//     mary,
//     puppet,
//   }         = createFixture()

//   const mp = new MiniProgram({
//     title: 'mock',
//   })

//   await puppet.start()

//   let receive
//   mary.on('message', async message => {
//     receive = await message.toMiniprogram()
//   })

//   user.say(mp).to(mary)

//   await sleep()
//   assert.deepEqual(receive, mp, 'should received the expected contact message payload')
//   await puppet.stop()
// })
