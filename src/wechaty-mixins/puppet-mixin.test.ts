#!/usr/bin/env node
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { function as FP } from 'fp-ts'
import * as PUPPET from 'wechaty-puppet'
import { PuppetMock } from 'wechaty-puppet-mock'

import '../wechaty/wechaty-impl.ts'

import {
  gErrorMixin,
}                             from '../wechaty-mixins/mod.ts'
import { WechatyBase } from '../wechaty/wechaty-base.ts'
import { WechatySkeleton } from '../wechaty/wechaty-skeleton.ts'
import { ioMixin } from './io-mixin.ts'
import { wechatifyUserModuleMixin } from './wechatify-user-module-mixin.ts'

import type {
  PuppetMixin,
  ProtectedPropertyPuppetMixin,
}                                             from './puppet-mixin.ts'
import { puppetMixin } from './puppet-mixin.ts'

test('ProtectedPropertyPuppetMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPuppetMixin, keyof InstanceType<PuppetMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('__setupPuppetEvents() should ignore unsupported puppet events', async _t => {
  const mixinBase = FP.pipe(
    WechatySkeleton,
    gErrorMixin,
    ioMixin,
    wechatifyUserModuleMixin,
    puppetMixin,
  )

  class PuppetMixinTest extends mixinBase {}

  const wechaty = new PuppetMixinTest({ puppet: 'wechaty-puppet-mock' })

  const fakePuppet = {
    currentUserId: 'test-user',
    listenerCount: () => 0,
    on: () => fakePuppet,
    roomMemberPayloadDirty: async () => {},
    roomPayloadDirty: async () => {},
  } as any as PUPPET.impls.PuppetInterface

  const eventDict = PUPPET.types.PUPPET_EVENT_DICT as unknown as Record<string, unknown>
  const unknownEventName = '__future-unknown-event__'
  const hadUnknownEvent = Object.hasOwn(eventDict, unknownEventName)
  const oldUnknownEvent = eventDict[unknownEventName]

  eventDict[unknownEventName] = undefined
  try {
    assert.doesNotThrow(
      () => (wechaty as any).__setupPuppetEvents(fakePuppet),
      'should not throw during setup when unknown puppet event exists',
    )
  } finally {
    if (hadUnknownEvent) {
      eventDict[unknownEventName] = oldUnknownEvent
    } else {
      delete eventDict[unknownEventName]
    }
  }
})

test('puppet event registration stays single across init and service cycles', async () => {
  const puppet = new PuppetMock()
  const bot = new WechatyBase({ puppet })
  let puppetEventBeforeGetterAssignment = false

  bot.on('puppet', eventPuppet => {
    assert.equal(eventPuppet, puppet, 'should emit the resolved puppet')
    assert.throws(() => bot.puppet, 'should emit puppet before assigning the public getter')
    puppetEventBeforeGetterAssignment = true
  })

  await bot.init()
  const listenerCount = puppet.listenerCount('message')
  await bot.init()

  await bot.start()
  await bot.stop()
  await bot.start()
  await bot.stop()

  assert.ok(puppetEventBeforeGetterAssignment, 'should emit the compatibility event during initial setup')
  assert.equal(listenerCount, 1, 'should register one message listener')
  assert.equal(puppet.listenerCount('message'), listenerCount, 'should keep the same listener registration across lifecycle cycles')
})
