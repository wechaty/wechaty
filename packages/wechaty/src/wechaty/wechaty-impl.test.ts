#!/usr/bin/env node
import { test } from 'node:test'
import assert from 'node:assert/strict'
import PuppetMock from 'wechaty-puppet-mock'

import { WechatyEventEmitter } from '../schemas/wechaty-events.ts'

import type {
  ContactSelfConstructor,
  ContactConstructor,
  FriendshipConstructor,
  ImageConstructor,
  LocationConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  PostConstructor,
  RoomInvitationConstructor,
  RoomConstructor,
  DelayConstructor,
  TagConstructor,
  UrlLinkConstructor,
}                             from '../user-modules/mod.ts'

import {
  type WechatyConstructor,
  type Wechaty,
  type WechatyInterface,
  type AllProtectedProperty,
  WechatyImpl,
  // WechatyConstructor,
}                       from './wechaty-impl.ts'

test('Wechaty interface', async _t => {
  abstract class WechatyImplementation extends WechatyEventEmitter implements WechatyInterface {

    Contact        : ContactConstructor
    ContactSelf    : ContactSelfConstructor
    Delay          : DelayConstructor
    Friendship     : FriendshipConstructor
    Image          : ImageConstructor
    Location       : LocationConstructor
    Message        : MessageConstructor
    MiniProgram    : MiniProgramConstructor
    Post           : PostConstructor
    Room           : RoomConstructor
    RoomInvitation : RoomInvitationConstructor
    Tag            : TagConstructor
    UrlLink        : UrlLinkConstructor

    constructor () {
      super()
      // this.puppet
      this.Contact
        = this.ContactSelf
        = this.Delay
        = this.Friendship
        = this.Image
        = this.Location
        = this.Message
        = this.MiniProgram
        = this.Post
        = this.Room
        = this.RoomInvitation
        = this.Tag
        = this.UrlLink
        = {} as any
    }

    abstract authQrCode  : Wechaty['authQrCode']
    abstract currentUser : Wechaty['currentUser']
    abstract ding        : Wechaty['ding']
    abstract emitError   : WechatyInterface['emitError']
    abstract id          : WechatyInterface['id']
    abstract init        : WechatyInterface['init']
    abstract io          : WechatyInterface['io']
    abstract isLoggedIn  : WechatyInterface['isLoggedIn']
    abstract legacyState : WechatyInterface['legacyState']
    abstract log         : WechatyInterface['log']
    abstract logout      : WechatyInterface['logout']
    abstract memory      : WechatyInterface['memory']
    abstract name        : WechatyInterface['name']
    abstract publish     : WechatyInterface['publish']
    abstract puppet      : WechatyInterface['puppet']
    abstract ready       : WechatyInterface['ready']
    abstract reset       : WechatyInterface['reset']
    abstract restart     : WechatyInterface['restart']
    abstract say         : WechatyInterface['say']
    abstract sleep       : WechatyInterface['sleep']
    abstract start       : WechatyInterface['start']
    abstract state       : WechatyInterface['state']
    abstract stop        : WechatyInterface['stop']
    abstract use         : WechatyInterface['use']
    abstract version     : WechatyInterface['version']
    abstract wechaty     : WechatyInterface['wechaty']
    abstract whenState   : WechatyInterface['whenState']
    abstract wrapAsync   : WechatyInterface['wrapAsync']

    messages: Wechaty['messages'] = this.events as any
    messageStream: Wechaty['messageStream'] = (() => {}) as any
    [Symbol.asyncDispose] = async () => {}

  }

  const WechatyTest = WechatyImplementation as unknown as WechatyConstructor
  const w: Wechaty = new WechatyTest()
  // Backwards compatibility verification: WechatyInterface should be an alias of Wechaty
  const wDeprecated: WechatyInterface = w
  wDeprecated.addEventListener('message', (event) => {
    event.detail.say('ok').catch(console.error)
  })

  assert.ok(typeof WechatyImplementation, 'should no typing error')
})

test('ProtectedProperties', async _t => {
  type NotExistInWechaty = Exclude<AllProtectedProperty, keyof WechatyImpl | `_${string}`>
  type NotExistTest = NotExistInWechaty extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Wechaty properties for every protected property')
})

test('options.puppet initialization', async _t => {
  const puppet  = new PuppetMock()
  const wechaty = new WechatyImpl({ puppet })
  assert.throws(() => wechaty.puppet, 'should throw when access puppet getter before init()')

  await wechaty.init()
  assert.doesNotThrow(() => wechaty.puppet, 'should not throw when access puppet getter after init()')
  assert.ok(wechaty.puppet, 'should exist puppet instance by setting the options.puppet')
})
