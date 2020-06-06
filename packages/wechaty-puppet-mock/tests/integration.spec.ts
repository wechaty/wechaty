#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { Wechaty } from 'wechaty'

import {
  PuppetMock,
  Mocker,
}                         from '../src/'

test('integration testing', async t => {
  const mocker = new Mocker()
  const puppet = new PuppetMock({ mocker })
  const wechaty = new Wechaty({ puppet })

  t.ok(wechaty, 'should instantiate wechaty with puppet mocker')
})

test('Contact.find() mocker.createContacts()', async t => {
  const mocker = new Mocker()
  const puppet = new PuppetMock({ mocker })
  const wechaty = new Wechaty({ puppet })

  try {
    await wechaty.start()

    const CONTACTS_NUM = 5
    const [ user, mike ] = mocker.createContacts(CONTACTS_NUM)
    mocker.login(user)

    const contactList = await wechaty.Contact.findAll()
    t.equal(contactList.length, CONTACTS_NUM, 'should find all contacts create by mocker')

    const contact = await wechaty.Contact.find({ name: mike.payload.name })
    t.ok(contact, 'should find a contact by name of mike')
    t.equal(contact!.id, mike.id, 'should find the contact the same id as mike')
  } finally {
    await wechaty.stop()
  }
})

test('Room.find() mocker.createRooms()', async t => {
  const mocker = new Mocker()
  const puppet = new PuppetMock({ mocker })
  const wechaty = new Wechaty({ puppet })

  try {
    await wechaty.start()

    const user = mocker.createContact()
    mocker.login(user)

    const ROOMS_NUM = 5
    const [ starbucks ] = mocker.createRooms(ROOMS_NUM)

    const roomList = await wechaty.Room.findAll()
    t.equal(roomList.length, ROOMS_NUM, 'should find all rooms create by mocker')

    const room = await wechaty.Room.find({ topic: starbucks.payload.topic })
    t.ok(room, 'should find a room by topic of starbucks')
    t.equal(room!.id, starbucks.id, 'should find the room the same id as starbucks')
  } finally {
    await wechaty.stop()
  }
})
