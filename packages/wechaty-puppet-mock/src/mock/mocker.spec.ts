#!/usr/bin/env ts-node

import test  from 'tstest'
import sinon from 'sinon'

import {
  // UrlLink,
  Wechaty,
  // MiniProgram,
}                       from 'wechaty'
import {
  EventScanPayload,
  ScanStatus,
  EventLoginPayload,
  EventMessagePayload,
  MessagePayload,
  MessageType,
  FileBox,
}                         from 'wechaty-puppet'

import { PuppetMock }         from '../puppet-mock'

import { MessageMock }        from './user/message-mock'

import { Mocker }             from './mocker'
import { SimpleEnvironment }  from './environment'

const sleep = () => new Promise(resolve => setImmediate(resolve))

class MockerTest extends Mocker {
}

function createFixture () {
  const mocker = new Mocker()
  const puppet = new PuppetMock({ mocker })

  const [user, mike, mary] = mocker.createContacts(3)
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

test('Mocker restart without problem', async t => {
  const mocker = new MockerTest()
  mocker.use(SimpleEnvironment())
  const puppet = new PuppetMock({ mocker })
  void puppet

  try {
    for (let i = 0; i < 3; i++) {
      await mocker.start()
      await mocker.puppet.logout()
      await mocker.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('Mocker() start/restart succeed.')
  } catch (e) {
    t.fail(e)
  }
})

test('Mocker.scan()', async t => {
  const {
    mocker,
    puppet,
  }         = createFixture()

  const QR_CODE = 'https://github.com/wechaty'
  const EXPECTED_PAYLOAD: EventScanPayload = {
    qrcode: QR_CODE,
    status: ScanStatus.Waiting,
  }

  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()
  puppet.on('scan', spy)

  await puppet.start()
  mocker.scan(QR_CODE, ScanStatus.Waiting)

  t.ok(spy.calledOnce, 'should received the scan event')
  t.ok(spy.calledWith(EXPECTED_PAYLOAD), 'should received expected QR CODE')

  await puppet.stop()
})

test('Mocker.login()', async t => {
  const {
    user,
    mocker,
    puppet,
  }         = createFixture()

  const EXPECTED_PAYLOAD: EventLoginPayload = {
    contactId: user.id,
  }

  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()
  puppet.on('login', spy)

  await puppet.start()
  mocker.login(user)

  t.ok(spy.calledOnce, 'should received the login event')
  t.ok(spy.calledWith(EXPECTED_PAYLOAD), 'should received expected login payload')

  await puppet.stop()
})

test('MockContact.say().to(contact)', async t => {
  const {
    user,
    mary,
    puppet,
  }         = createFixture()

  const TEXT = 'Hello, contact!'

  const future = new Promise<EventMessagePayload>(resolve => puppet.once('message', resolve))

  await puppet.start()
  user.say(TEXT).to(mary)

  const { messageId } = await future

  const EXPECTED_PAYLOAD: MessagePayload = {
    fromId    : user.id,
    id        : messageId,
    text      : TEXT,
    timestamp : Date.now(),
    toId      : mary.id,
    type      : MessageType.Text,
  }

  const payload = await puppet.messagePayload(messageId)

  EXPECTED_PAYLOAD.timestamp = payload.timestamp

  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should received the expected text message payload')

  await puppet.stop()
})

test('MockContact.say().to(room)', async t => {
  const {
    user,
    room,
    puppet,
  }         = createFixture()

  const TEXT = 'Hello, room!'

  const future = new Promise<EventMessagePayload>(resolve => puppet.once('message', resolve))

  await puppet.start()
  user.say(TEXT).to(room)

  const { messageId } = await future

  const EXPECTED_PAYLOAD: MessagePayload = {
    fromId        : user.id,
    id            : messageId,
    mentionIdList : [],
    roomId        : room.id,
    text          : TEXT,
    timestamp     : Date.now(),
    type          : MessageType.Text,
  }

  const payload = await puppet.messagePayload(messageId)

  EXPECTED_PAYLOAD.timestamp = payload.timestamp

  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should received the expected room message payload')

  await puppet.stop()
})

test('event(message) for MockContact & MockRoom', async t => {
  const {
    user,
    room,
    puppet,
  }         = createFixture()

  const sandbox = sinon.createSandbox()
  const roomSpy = sandbox.spy()
  const userSpy = sandbox.spy()

  user.on('message', userSpy)
  room.on('message', roomSpy)

  const TEXT = 'hello'

  try {
    await puppet.start()

    user.say(TEXT).to(room)

    t.ok(userSpy.calledOnce, 'should emit message event on user')
    t.ok(roomSpy.calledOnce, 'should emit message event on room')

    const userMsg = userSpy.args[0][0] as MessageMock
    const roomMsg = roomSpy.args[0][0] as MessageMock

    t.deepEqual(userMsg.payload, roomMsg.payload, 'should receive the same message for both user & room')

    t.equal(userMsg.payload.text, TEXT, 'should receive the TEXT as the message')
  } finally {
    await puppet.stop()
  }
})

test('Multiple Mockers with their MockContact(s)', async t => {
  const mocker1 = new Mocker()
  const mocker2 = new Mocker()

  const ID = 'id'

  const contact1 = mocker1.createContact({ id: ID })
  const contact2 = mocker2.createContact({ id: ID })

  t.notEqual(contact1, contact2, 'should have separate MockContact classes')
  t.equal(contact1.id, contact2.id, 'should have the same id from different mocker instances')
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
//   t.deepEqual(receive, url, 'should received the expected contact message payload')
//   await puppet.stop()
// })

// test.skip('wechaty.reply(url)', async t => {
//   const {
//     user,
//     mary,
//     puppet,
//     mocker,
//   }         = createFixture()
//   await puppet.start()
//   await mocker.login(user)
//   const wechaty = new Wechaty({ puppet })
//   await wechaty.start()
//   const url = new UrlLink({
//     title: 'mock',
//     url: 'http://www.mock.com',
//   })
//   wechaty.on('message', async message => {
//     if (message.self()) {
//       return
//     }
//     await message.say(url)
//   })

//   let receive
//   mary.on('message', async message => {
//     if (message.type() === MessageType.Text) {
//       return
//     }
//     receive = await message.toUrlLink()
//   })

//   mary.say('test').to(user)

//   await sleep()
//   t.deepEqual(receive, url, 'should received the expected contact message payload')
//   await puppet.stop()
//   await wechaty.stop()
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
//   t.deepEqual(receive, mike, 'should received the expected contact message payload')
//   await puppet.stop()
// })

test.skip('wechaty.reply(contact)', async t => {
  const {
    user,
    mary,
    puppet,
    mocker,
    mike,
  }         = createFixture()
  await puppet.start()
  await mocker.login(user)
  const wechaty = new Wechaty({ puppet })
  await wechaty.start()
  wechaty.on('message', async message => {
    if (message.self()) {
      return
    }
    const mikeContact = await wechaty.Contact.find({ name: mike.payload.name })
    if (!mikeContact) {
      return
    }
    await message.say(mikeContact)
  })

  let receive
  mary.on('message', async message => {
    if (message.type() === MessageType.Text) {
      return
    }
    receive = await message.toContact()
  })

  mary.say('test').to(user)
  await sleep()
  t.deepEqual(receive, mike, 'should received the expected contact message payload')
  await puppet.stop()
  await wechaty.stop()
})

test.skip('MockContact.say(fileBox).to(contact)', async t => {
  const {
    user,
    mary,
    puppet,
  }         = createFixture()

  await puppet.start()

  let receive
  mary.on('message', async message => {
    receive = await message.toFileBox()
  })

  const fileBox = FileBox.fromBase64(
    'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ==',
    'mock-file.txt',
  )
  user.say(fileBox).to(mary)

  await sleep()
  t.deepEqual(receive, fileBox, 'should received the expected fileBox message payload')
  await puppet.stop()
})

test.skip('wechaty.reply(fileBox)', async t => {
  const {
    user,
    mary,
    puppet,
    mocker,
  }         = createFixture()
  await puppet.start()
  await mocker.login(user)
  const wechaty = new Wechaty({ puppet })
  await wechaty.start()

  const fileBox = FileBox.fromBase64(
    'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ==',
    'mock-file.txt',
  )
  wechaty.on('message', async message => {
    if (message.self()) {
      return
    }
    await message.say(fileBox)
  })

  let receive
  mary.on('message', async message => {
    if (message.type() === MessageType.Text) {
      return
    }
    receive = await message.toFileBox()
  })

  mary.say('test').to(user)
  await sleep()
  t.deepEqual(receive, fileBox, 'should received the expected fileBox message payload')
  await puppet.stop()
  await wechaty.stop()
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
//   t.deepEqual(receive, mp, 'should received the expected contact message payload')
//   await puppet.stop()
// })

// test.skip('wechaty.reply(miniprogram)', async t => {
//   const {
//     user,
//     mary,
//     puppet,
//     mocker,
//   }         = createFixture()
//   await puppet.start()
//   await mocker.login(user)
//   const wechaty = new Wechaty({ puppet })
//   await wechaty.start()
//   const mp = new MiniProgram({
//     title: 'mock',
//   })
//   wechaty.on('message', async message => {
//     if (message.self()) {
//       return
//     }
//     await message.say(mp)
//   })

//   let receive
//   mary.on('message', async message => {
//     if (message.type() === MessageType.Text) {
//       return
//     }
//     receive = await message.toMiniprogram()
//   })

//   mary.say('test').to(user)
//   await sleep()
//   t.deepEqual(receive, mp, 'should received the expected contact message payload')
//   await puppet.stop()
//   await wechaty.stop()
// })
