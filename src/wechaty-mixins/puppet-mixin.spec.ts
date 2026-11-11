#!/usr/bin/env -S node --import=tsx/esm
import { test } from 'tstest'
import { PuppetMock } from 'wechaty-puppet-mock'

import '../wechaty/wechaty-impl.js'
import { WechatyBase } from '../wechaty/wechaty-base.js'

import type {
  PuppetMixin,
  ProtectedPropertyPuppetMixin,
}                                             from './puppet-mixin.js'

test('ProtectedPropertyPuppetMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPuppetMixin, keyof InstanceType<PuppetMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('puppet event registration stays single across init and service cycles', async t => {
  const puppet = new PuppetMock()
  const bot = new WechatyBase({ puppet })
  let puppetEventBeforeGetterAssignment = false

  bot.on('puppet', eventPuppet => {
    t.equal(eventPuppet, puppet, 'should emit the resolved puppet')
    t.throws(() => bot.puppet, 'should emit puppet before assigning the public getter')
    puppetEventBeforeGetterAssignment = true
  })

  await bot.init()
  const listenerCount = puppet.listenerCount('message')
  await bot.init()

  await bot.start()
  await bot.stop()
  await bot.start()
  await bot.stop()

  t.ok(puppetEventBeforeGetterAssignment, 'should emit the compatibility event during initial setup')
  t.equal(listenerCount, 1, 'should register one message listener')
  t.equal(puppet.listenerCount('message'), listenerCount, 'should keep the same listener registration across lifecycle cycles')
})
