#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { EventEmitter } from 'events'

import { test } from 'tstest'

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
  // WechatyConstructor,
}                       from './wechaty-interface.js'

import type {
  WechatyImpl,
}                       from '../wechaty.js'

test('Wechaty interface', async t => {
  abstract class WechatyImplementation extends EventEmitter implements WechatyInterface {

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

    id     : WechatyInterface['id']
    puppet : WechatyInterface['puppet']
    state  : WechatyInterface['state']

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
        = this.Room
        = this.RoomInvitation
        = this.state
        = this.Tag
        = this.UrlLink
        = {} as any
    }

    abstract addEventListener    : WechatyInterface['addEventListener']
    abstract currentUser         : WechatyInterface['currentUser']
    abstract ding                : WechatyInterface['ding']
    abstract emitError           : WechatyInterface['emitError']
    abstract logonoff            : WechatyInterface['logonoff']
    abstract logout              : WechatyInterface['logout']
    abstract name                : WechatyInterface['name']
    abstract ready               : WechatyInterface['ready']
    abstract removeEventListener : WechatyInterface['removeEventListener']
    abstract reset               : WechatyInterface['reset']
    abstract say                 : WechatyInterface['say']
    abstract sleep               : WechatyInterface['sleep']
    abstract start               : WechatyInterface['start']
    abstract stop                : WechatyInterface['stop']
    abstract use                 : WechatyInterface['use']
    abstract version             : WechatyInterface['version']
    abstract wrapAsync           : WechatyInterface['wrapAsync']

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
