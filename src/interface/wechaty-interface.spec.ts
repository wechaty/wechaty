#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { EventEmitter }       from 'events'
import type { StateSwitch }   from 'state-switch'

import { test } from 'tstest'
import type { PuppetInterface } from 'wechaty-puppet'
import type {
  Message,
  ContactSelfConstructor,
  ContactConstructor,
  FriendshipConstructor,
  ImageConstructor,
  LocationConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  RoomInvitationConstructor,
  RoomConstructor,
  SleeperConstructor,
  TagConstructor,
  UrlLinkConstructor,
}                             from '../user/mod.js'

import type {
  WechatyConstructor,
  Wechaty,
  // WechatyConstructor,
}                       from './wechaty-interface.js'

test('Wechaty interface', async t => {
  abstract class WechatyImplementation extends EventEmitter implements Wechaty {

    Contact        : ContactConstructor
    ContactSelf    : ContactSelfConstructor
    Friendship     : FriendshipConstructor
    Image          : ImageConstructor
    Location       : LocationConstructor
    Message        : MessageConstructor
    MiniProgram    : MiniProgramConstructor
    Room           : RoomConstructor
    RoomInvitation : RoomInvitationConstructor
    Sleeper        : SleeperConstructor
    Tag            : TagConstructor
    UrlLink        : UrlLinkConstructor

    id     : string
    puppet : PuppetInterface
    state  : StateSwitch

    constructor () {
      super()
      this.id
        = this.Contact
        = this.ContactSelf
        = this.Friendship
        = this.Image
        = this.Location
        = this.Message
        = this.MiniProgram
        = this.puppet
        = this.Room
        = this.RoomInvitation
        = this.state
        = this.Sleeper
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
