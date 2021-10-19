#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { EventEmitter }       from 'events'
import type { StateSwitch }   from 'state-switch'

import { test } from 'tstest'
import type { PuppetInterface } from 'wechaty-puppet'
import type { Message } from '../mod.js'

import type {
  WechatyConstructor,
  WechatyInterface,
  // WechatyConstructor,
}                       from './wechaty-interface.js'

test('WechatyInterface', async t => {
  abstract class WechatyImplementation extends EventEmitter implements WechatyInterface {

    id     : string
    puppet : PuppetInterface
    state  : StateSwitch

    constructor () {
      super()
      this.id = this.state = this.puppet = {} as any
    }

    abstract currentUser : WechatyInterface['currentUser']
    abstract ding        : WechatyInterface['ding']
    abstract logonoff    : WechatyInterface['logonoff']
    abstract logout      : WechatyInterface['logout']
    abstract name        : WechatyInterface['name']
    abstract ready       : WechatyInterface['ready']
    abstract reset       : WechatyInterface['reset']
    abstract say         : WechatyInterface['say']
    abstract start       : WechatyInterface['start']
    abstract stop        : WechatyInterface['stop']
    abstract use         : WechatyInterface['use']
    abstract version     : WechatyInterface['version']

  }

  const Wechaty = WechatyImplementation as unknown as WechatyConstructor
  const w: WechatyInterface = new Wechaty()
  w.on('message', (msg: Message) => {
    msg.say('ok').catch(console.error)
  })

  t.ok(typeof WechatyImplementation, 'should no typing error')
})
