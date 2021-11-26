#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'

import { WechatyEventEmitter } from '../schemas/wechaty-events.js'

import type {
  ContactSelfConstructor,
  ContactConstructor,
  FriendshipConstructor,
  ImageConstructor,
  LocationConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  RoomInvitationConstructor,
  RoomConstructor,
  DelayConstructor,
  TagConstructor,
  UrlLinkConstructor,
  MessageInterface,
}                             from '../user-modules/mod.js'

import type {
  WechatyConstructor,
  WechatyInterface,
  AllProtectedProperty,
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
    Room           : RoomConstructor
    RoomInvitation : RoomInvitationConstructor
    Tag            : TagConstructor
    UrlLink        : UrlLinkConstructor

    constructor () {
      super()
      this.Contact
        = this.ContactSelf
        = this.Delay
        = this.Friendship
        = this.Image
        = this.Location
        = this.Message
        = this.MiniProgram
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
    abstract isLoggedIn  : WechatyInterface['isLoggedIn']
    abstract log         : WechatyInterface['log']
    abstract logout      : WechatyInterface['logout']
    abstract name        : WechatyInterface['name']
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
