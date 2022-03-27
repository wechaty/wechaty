#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'
import PuppetMock from 'wechaty-puppet-mock'

import { WechatyEventEmitter } from '../schemas/wechaty-events.js'

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
  MessageInterface,
}                             from '../user-modules/mod.js'

import {
  type WechatyConstructor,
  type WechatyInterface,
  type AllProtectedProperty,
  WechatyImpl,
  // WechatyConstructor,
}                       from './wechaty-impl.js'

test('Wechaty interface', async t => {
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

    abstract authQrCode  : WechatyInterface['authQrCode']
    abstract currentUser : WechatyInterface['currentUser']
    abstract ding        : WechatyInterface['ding']
    abstract emitError   : WechatyInterface['emitError']
    abstract id          : WechatyInterface['id']
    abstract init        : WechatyInterface['init']
    abstract isLoggedIn  : WechatyInterface['isLoggedIn']
    abstract log         : WechatyInterface['log']
    abstract logout      : WechatyInterface['logout']
    abstract name        : WechatyInterface['name']
    abstract publish     : WechatyInterface['publish']
    abstract puppet      : WechatyInterface['puppet']
    abstract ready       : WechatyInterface['ready']
    abstract reset       : WechatyInterface['reset']
    abstract say         : WechatyInterface['say']
    abstract sleep       : WechatyInterface['sleep']
    abstract start       : WechatyInterface['start']
    abstract state       : WechatyInterface['state']
    abstract stop        : WechatyInterface['stop']
    abstract use         : WechatyInterface['use']
    abstract version     : WechatyInterface['version']
    abstract wrapAsync   : WechatyInterface['wrapAsync']

  }

  const WechatyTest = WechatyImplementation as unknown as WechatyConstructor
  const w: WechatyInterface = new WechatyTest()
  w.on('message', (msg: MessageInterface) => {
    msg.say('ok').catch(console.error)
  })

  t.ok(typeof WechatyImplementation, 'should no typing error')
})

test('ProtectedProperties', async t => {
  type NotExistInWechaty = Exclude<AllProtectedProperty, keyof WechatyImpl | `_${string}`>
  type NotExistTest = NotExistInWechaty extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Wechaty properties for every protected property')
})

test('options.puppet initialization', async t => {
  const puppet  = new PuppetMock()
  const wechaty = new WechatyImpl({ puppet })
  t.throws(() => wechaty.puppet, 'should throw when access puppet getter before init()')

  await wechaty.init()
  t.doesNotThrow(() => wechaty.puppet, 'should not throw when access puppet getter after init()')
  t.ok(wechaty.puppet, 'should exist puppet instance by setting the options.puppet')
})
