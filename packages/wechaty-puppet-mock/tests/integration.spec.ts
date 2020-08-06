#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { Wechaty } from 'wechaty'

import {
  PuppetMock,
  mock,
}                         from '../src/mod'

async function * wechatyFixture () {
  const mocker  = new mock.Mocker()
  const puppet  = new PuppetMock({ mocker })
  const wechaty = new Wechaty({ puppet })

  try {
    await wechaty.start()

    yield {
      mocker,
      wechaty,
    }

  } finally {
    await wechaty.stop()
  }
}

test('integration testing', async t => {
  const mocker = new mock.Mocker()
  const puppet = new PuppetMock({ mocker })
  const wechaty = new Wechaty({ puppet })

  t.ok(wechaty, 'should instantiate wechaty with puppet mocker')
})

test('Contact.find() mocker.createContacts()', async t => {
  for await (const {
    mocker,
    wechaty,
  } of wechatyFixture()) {
    const CONTACTS_NUM = 5
    const [user, mike] = mocker.createContacts(CONTACTS_NUM)
    mocker.login(user)

    const contactList = await wechaty.Contact.findAll()
    t.equal(contactList.length, CONTACTS_NUM, 'should find all contacts create by mocker')

    const contact = await wechaty.Contact.find({ name: mike.payload.name })
    t.ok(contact, 'should find a contact by name of mike')
    t.equal(contact!.id, mike.id, 'should find the contact the same id as mike')
  }
})

test('Room.find() mocker.createRooms()', async t => {
  for await (const {
    mocker,
    wechaty,
  } of wechatyFixture()) {
    const user = mocker.createContact()
    mocker.login(user)

    const ROOMS_NUM = 5
    const [starbucks] = mocker.createRooms(ROOMS_NUM)

    const roomList = await wechaty.Room.findAll()
    t.equal(roomList.length, ROOMS_NUM, 'should find all rooms create by mocker')

    const room = await wechaty.Room.find({ topic: starbucks.payload.topic })
    t.ok(room, 'should find a room by topic of starbucks')
    t.equal(room!.id, starbucks.id, 'should find the room the same id as starbucks')
  }
})

test('Contact.load() mocker.createContact()', async t => {
  for await (const {
    mocker,
    wechaty,
  } of wechatyFixture()) {

    const user = mocker.createContact()
    mocker.login(user)

    const FILE_HELPER_ID = 'filehelper'

    const filehelper = mocker.createContact({
      id: FILE_HELPER_ID,
    })

    const contact = await wechaty.Contact.load(FILE_HELPER_ID)

    t.ok(contact, 'should load contact by id')
    t.equal(contact!.id, filehelper.id, 'should load contact with id the same as filehelper')

    await contact.ready()
    t.deepEqual((contact as any).payload, filehelper.payload, 'should match the payload between wechaty contact & mock contact')
  }
})

test('Room.load() mocker.createRoom()', async t => {
  for await (const {
    mocker,
    wechaty,
  } of wechatyFixture()) {

    const user = mocker.createContact()
    mocker.login(user)

    const starbucks = mocker.createRoom()

    const room = await wechaty.Room.load(starbucks.id)

    t.ok(room, 'should load room by id')
    t.equal(room!.id, starbucks.id, 'should load room with id the same as starbucks')

    await room.ready()
    t.deepEqual((room as any).payload, starbucks.payload, 'should match the payload between wechaty room & mock room')
  }
})
