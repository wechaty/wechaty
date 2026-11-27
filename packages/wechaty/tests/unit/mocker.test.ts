/**
 * Wechaty over `PuppetMock` with a `Mocker`: the user modules find and load
 * contacts and rooms that the mocker creates. A bot starts, becomes ready,
 * receives and replies to a mock contact, and stops.
 *
 * Ported from wechaty-puppet-mock's former `tests/integration.spec.ts`, which
 * left the mock in wechaty/wechaty#3069 because the mock must not depend on
 * `wechaty` (a dependency cycle).
 */
import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { PuppetMock, mock } from 'wechaty-puppet-mock'

import type { Message } from '../../src/mods/mod.ts'
import { Wechaty } from '../../src/wechaty/mod.ts'

/** Starts a bot over a fresh mocker and stops it when the test `t` ends. */
async function startBot (t: TestContext) {
  const mocker  = new mock.Mocker()
  const puppet  = new PuppetMock({ mocker })
  const wechaty = new Wechaty({ puppet })

  await wechaty.start()
  t.after(() => wechaty.stop())

  return { mocker, puppet, wechaty }
}

test('Contact.find() mocker.createContacts()', async t => {
  const { mocker, wechaty } = await startBot(t)

  const CONTACTS_NUM = 5
  const [ user, mike ] = mocker.createContacts(CONTACTS_NUM) as [ mock.ContactMock, mock.ContactMock ]
  mocker.login(user)

  const contactList = await wechaty.Contact.findAll()
  assert.equal(contactList.length, CONTACTS_NUM, 'should find all contacts created by the mocker')

  const contact = await wechaty.Contact.find({ name: mike.payload.name })
  assert.ok(contact, 'should find a contact by the name of mike')
  assert.equal(contact.id, mike.id, 'should find the contact with the same id as mike')
})

test('Room.find() mocker.createRooms()', async t => {
  const { mocker, wechaty } = await startBot(t)

  const user = mocker.createContact()
  mocker.login(user)

  const ROOMS_NUM = 5
  const [ starbucks ] = mocker.createRooms(ROOMS_NUM) as [ mock.RoomMock ]

  const roomList = await wechaty.Room.findAll()
  assert.equal(roomList.length, ROOMS_NUM, 'should find all rooms created by the mocker')

  const room = await wechaty.Room.find({ topic: starbucks.payload.topic })
  assert.ok(room, 'should find a room by the topic of starbucks')
  assert.equal(room.id, starbucks.id, 'should find the room with the same id as starbucks')
})

test('Contact.find() by id loads a mocker contact', async t => {
  const { mocker, wechaty } = await startBot(t)

  const user = mocker.createContact()
  mocker.login(user)

  const FILE_HELPER_ID = 'filehelper'
  const filehelper = mocker.createContact({ id: FILE_HELPER_ID })

  const contact = await wechaty.Contact.find({ id: FILE_HELPER_ID })
  assert.ok(contact, 'should load the contact by id')
  assert.equal(contact.id, filehelper.id, 'should load the contact with the same id as filehelper')
  assert.equal(contact.name(), filehelper.payload.name, 'should match the payload name of the mock contact')
})

test('Room.find() by id loads a mocker room', async t => {
  const { mocker, wechaty } = await startBot(t)

  const user = mocker.createContact()
  mocker.login(user)

  const starbucks = mocker.createRoom()

  const room = await wechaty.Room.find({ id: starbucks.id })
  assert.ok(room, 'should load the room by id')
  assert.equal(room.id, starbucks.id, 'should load the room with the same id as starbucks')
  assert.equal(await room.topic(), starbucks.payload.topic, 'should match the payload topic of the mock room')
})

test('a mock bot starts, becomes ready, replies, and stops', { timeout: 10_000 }, async t => {
  const { mocker, puppet, wechaty } = await startBot(t)

  const bot    = mocker.createContact({ name: 'Bot' })
  const player = mocker.createContact({ name: 'Player' })
  mocker.login(bot)

  const ready = wechaty.ready()
  puppet.emit('ready', { data: 'mocker' })
  await ready

  const message = await new Promise<Message>(resolve => {
    wechaty.currentUser.once('message', resolve)
    player.say('ding').to(bot)
  })
  assert.equal(message.text(), 'ding', 'should receive the text the player said')
  assert.equal(message.talker().id, player.id, 'should come from the player')

  const reply = new Promise<mock.MessageMock>(resolve => player.once('message', resolve))
  await message.say('pong')
  const received = await reply
  assert.equal(received.text(), 'pong')
  assert.equal(received.talker().id, bot.id)

  await wechaty.stop()
  assert.ok(puppet.isStopped)
})
