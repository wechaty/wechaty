#!/usr/bin/env -S node --import=tsx/esm

import { test } from 'node:test'
import assert from 'node:assert/strict'

import * as WECHATY from './mod.js'
import type { Sayable } from './mod.js'
import type { Contact } from './users.js'
import type { ContactImpl } from './impls.js'
import type { WechatyImpl } from './impls.js'

function publicTypeContract (bot: WECHATY.Wechaty, contact: Contact) {
  bot.on('message', message => {
    const messageId: string = message.id
    void message.say('hello')
    void messageId
  })
  bot.on('login', loggedInContact => {
    const contactId: string = loggedInContact.id
    void contactId
  })

  const sayableText: Sayable = 'hello'
  void bot.say(sayableText)
  void bot.say(contact)

  type BoundContactImplementation = ContactImpl
  type ImplementationConstructor = typeof WechatyImpl
  const implementationConstructor: ImplementationConstructor = WECHATY.impls.WechatyImpl
  void implementationConstructor
  type PublicContactHasId = BoundContactImplementation['id']
  const publicContactHasId: PublicContactHasId = contact.id
  void publicContactHasId

  // @ts-expect-error Internal options are not part of the public interface.
  bot.__options
}
void publicTypeContract

test('Export of the Framework', async _t => {
  assert.ok(WECHATY.impls,     'should export impls.*')
  assert.ok(WECHATY.types,     'should export types.*')
  assert.ok(WECHATY.IoClient,  'should export IoClient')
  assert.ok(WECHATY.log,       'should export log')
})

test('Config setting', async _t => {
  assert.ok(WECHATY.config, 'should export Config')
  // assert.ok(config.default.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
})
