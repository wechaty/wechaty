#!/usr/bin/env node

import { test } from 'node:test'
import assert from 'node:assert/strict'

import * as WECHATY from './mod.ts'
import type { Sayable } from './mod.ts'
import type { Contact } from './users.ts'

function publicTypeContract (bot: WECHATY.Wechaty, contact: Contact) {
  bot.addEventListener('message', event => {
    const messageId: string = event.detail.id
    void event.detail.say('hello')
    void messageId
  })
  bot.addEventListener('login', event => {
    const contactId: string = event.detail.id
    void contactId
  })

  const sayableText: Sayable = 'hello'
  void bot.say(sayableText)
  void bot.say(contact)

  type PublicContactHasId = Contact['id']
  const publicContactHasId: PublicContactHasId = contact.id
  void publicContactHasId

  // @ts-expect-error Internal options are not part of the public interface.
  bot.__options
}
void publicTypeContract

test('Export of the Framework', async _t => {
  assert.equal((WECHATY as any).impls, undefined, 'should not export impls.*')
  assert.ok(WECHATY.types,     'should export types.*')
  assert.ok(WECHATY.IoClient,  'should export IoClient')
  assert.ok(WECHATY.log,       'should export log')
})

test('Config setting', async _t => {
  assert.ok(WECHATY.config, 'should export Config')
  // assert.ok(config.default.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
})

test('Wechaty constructor and statics runtime export', async _t => {
  assert.equal(typeof WECHATY.Wechaty, 'function', 'WECHATY.Wechaty should be a constructor function')
  assert.equal(typeof WECHATY.Wechaty.singleton, 'function', 'WECHATY.Wechaty.singleton should be a function')
  assert.equal(typeof WECHATY.Wechaty.valid, 'function', 'WECHATY.Wechaty.valid should be a function')

  const bot = new WECHATY.Wechaty()
  assert.ok(bot.id, 'instance created from main export should have id')
  assert.equal(WECHATY.Wechaty.valid(bot), true, 'Wechaty.valid() should return true for bot')
  assert.ok(WECHATY.Wechaty.singleton(), 'Wechaty.singleton() should return singleton instance')
})
