#!/usr/bin/env ts-node

import {
  test,
  sinon,
}             from 'tstest'

import {
  Message,
}             from 'wechaty'

import { MockContact } from './mocker/user/mock-contact'

import { createFixture } from './create-fixture'

test('createFixture() initial state', async (t) => {
  for await (const fixture of createFixture()) {
    t.true(fixture.message instanceof Message, 'should have message instance')
    t.equal(fixture.message.type(), Message.Type.Text, 'should have message with text type')
    t.equal(typeof fixture.message.text(), 'string', 'should have message with text content')

    t.equal(fixture.moList.length, 0, 'should be empty mo list')
    t.equal(fixture.mtList.length, 0, 'should be empty mt list')

    t.true(fixture.mary instanceof MockContact, 'should get mock contact mary')
    t.true(fixture.mike instanceof MockContact, 'should get mock contact mike')
  }
})

test('createFixture() Mobile Originated', async (t) => {
  for await (const fixture of createFixture()) {
    const spy = sinon.spy()
    fixture.wechaty.on('message', spy)

    fixture.user.say().to(fixture.mary)
    await new Promise(setImmediate)

    t.true(spy.called, 'should received message event')
    t.equal(spy.args[0][0].from().id, fixture.user.id, 'should get user as from')
    t.equal(spy.args[0][0].to().id, fixture.mary.id, 'should get mary as to')

    t.equal(fixture.moList.length, 1, 'should be 1 mo')
    t.equal(fixture.mtList.length, 0, 'should be empty mt list')
    t.equal(fixture.moList[0].id, spy.args[0][0].id, 'should get the same message instance')
  }
})

test('createFixture() Mobile Terminated', async (t) => {
  for await (const fixture of createFixture()) {
    const spy = sinon.spy()
    fixture.wechaty.on('message', spy)

    fixture.mary.say().to(fixture.user)
    await new Promise(setImmediate)

    t.true(spy.called, 'should received message event')
    t.equal(spy.args[0][0].to().id, fixture.user.id, 'should get user as to')
    t.equal(spy.args[0][0].from().id, fixture.mary.id, 'should get mary as from')

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
      await fixture.user.say(text).to(fixture.mary)
    }
    await new Promise(setImmediate)

    t.equal(fixture.moList.length, TEXT_LIST.length, 'should receive all TEXT_LIST')
    for (let i = 0; i < TEXT_LIST.length; i++) {
      t.ok(fixture.moList[i], `should exist moList for ${i}`)
      t.deepEqual(fixture.moList[i].text(), TEXT_LIST[i], `should get TEXT_LIST[${i}]: ${TEXT_LIST[i]}`)
    }
  }
})
