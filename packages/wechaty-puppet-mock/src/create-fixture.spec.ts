#!/usr/bin/env ts-node

import {
  test,
  sinon,
}                         from 'tstest'
import { Message }        from 'wechaty'

import { createFixture }  from './create-fixture'
import * as mock          from './mock/mod'

test('createFixture() initial state', async (t) => {
  for await (const fixture of createFixture()) {
    t.true(fixture.message instanceof Message, 'should have message instance')
    t.equal(fixture.message.type(), Message.Type.Text, 'should have message with text type')
    t.equal(typeof fixture.message.text(), 'string', 'should have message with text content')

    t.equal(fixture.message.talker().id, fixture.player.id, 'should get a message send from player')
    t.equal(fixture.message.to()!.id, fixture.bot.id, 'should get a message send to bot')
    t.false(fixture.message.room(), 'should get a message as direct message')

    t.equal(fixture.moList.length, 0, 'should be empty mo list')
    t.equal(fixture.mtList.length, 0, 'should be empty mt list')

    t.true(fixture.bot instanceof mock.ContactMock, 'should get mock contact mary')
    t.true(fixture.player instanceof mock.ContactMock, 'should get mock contact mike')
  }
})

test('createFixture() Mobile Originated', async (t) => {
  for await (const fixture of createFixture()) {
    const spy = sinon.spy()
    fixture.wechaty.on('message', spy)

    fixture.bot.say().to(fixture.player)
    await new Promise(setImmediate)

    t.true(spy.called, 'should received message event')
    t.equal(spy.args[0][0].from().id, fixture.bot.id, 'should get bot as from')
    t.equal(spy.args[0][0].to().id, fixture.player.id, 'should get player as to')

    t.equal(fixture.moList.length, 1, 'should be 1 mo')
    t.equal(fixture.mtList.length, 0, 'should be empty mt list')
    t.equal(fixture.moList[0].id, spy.args[0][0].id, 'should get the same message instance')
  }
})

test('createFixture() Mobile Terminated', async (t) => {
  for await (const fixture of createFixture()) {
    const spy = sinon.spy()
    fixture.wechaty.on('message', spy)

    fixture.player.say().to(fixture.bot)
    await new Promise(setImmediate)

    t.true(spy.called, 'should received message event')
    t.equal(spy.args[0][0].to().id, fixture.bot.id, 'should get bot as to')
    t.equal(spy.args[0][0].from().id, fixture.player.id, 'should get player as from')

    t.equal(fixture.moList.length, 0, 'should be 0 mo')
    t.equal(fixture.mtList.length, 1, 'should be 1 mt')
    t.equal(fixture.mtList[0].id, spy.args[0][0].id, 'should get the same message instance')
  }
})

test('user.say() multiple times with moList', async t => {
  for await (const fixture of createFixture()) {
    const TEXT_LIST = [
      'one',
      'two',
      'three',
    ]
    for (const text of TEXT_LIST) {
      await fixture.bot.say(text).to(fixture.player)
    }
    await new Promise(setImmediate)

    t.equal(fixture.moList.length, TEXT_LIST.length, 'should receive all TEXT_LIST')
    for (let i = 0; i < TEXT_LIST.length; i++) {
      t.ok(fixture.moList[i], `should exist moList for ${i}`)
      t.deepEqual(fixture.moList[i].text(), TEXT_LIST[i], `should get TEXT_LIST[${i}]: ${TEXT_LIST[i]}`)
    }
  }
})
