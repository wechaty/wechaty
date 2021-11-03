#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { EventEmitter } from 'events'

import { test } from 'tstest'

import type {
  Message,
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
}                             from '../user-modules/mod.js'

import type {
  WechatyConstructor,
  Wechaty,
  WechatyProtectedProperty,
  // WechatyConstructor,
}                       from './wechaty-interface.js'

import type {
  WechatyImpl,
}                       from '../wechaty.js'

test('Wechaty interface', async t => {
  abstract class WechatyImplementation extends EventEmitter implements Wechaty {

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

    id     : Wechaty['id']
    puppet : Wechaty['puppet']
    state  : Wechaty['state']

    constructor () {
      super()
      this.id
        = this.Contact
        = this.ContactSelf
        = this.Delay
        = this.Friendship
        = this.Image
        = this.Location
        = this.Message
        = this.MiniProgram
        = this.puppet
        = this.Post
        = this.Room
        = this.RoomInvitation
        = this.state
        = this.Tag
        = this.UrlLink
        = {} as any
    }

    abstract currentUser : Wechaty['currentUser']
    abstract ding        : Wechaty['ding']
    abstract emitError   : Wechaty['emitError']
    abstract logonoff    : Wechaty['logonoff']
    abstract logout      : Wechaty['logout']
    abstract name        : Wechaty['name']
    abstract ready       : Wechaty['ready']
    abstract reset       : Wechaty['reset']
    abstract say         : Wechaty['say']
    abstract sleep       : Wechaty['sleep']
    abstract start       : Wechaty['start']
    abstract stop        : Wechaty['stop']
    abstract use         : Wechaty['use']
    abstract version     : Wechaty['version']
    abstract wrapAsync   : Wechaty['wrapAsync']

  }

  const WechatyTest = WechatyImplementation as unknown as WechatyConstructor
  const w: Wechaty = new WechatyTest()
  w.on('message', (msg: Message) => {
    msg.say('ok').catch(console.error)
  })

  t.ok(typeof WechatyImplementation, 'should no typing error')
})

test('ProtectedProperties', async t => {
  type NotExistInWechaty = Exclude<WechatyProtectedProperty, keyof WechatyImpl | `_${string}`>
  type NotExistTest = NotExistInWechaty extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Wechaty properties for every protected property')
})
