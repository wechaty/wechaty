#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import {
  test,
  sinon,
}             from 'tstest'

import { function as FP } from 'fp-ts'
import {
  serviceCtlMixin,
}                         from 'state-switch'

/**
 * Huan(202201): must import `./wechaty-impl.js` first
 *
 * Or will throw error:
 *
 * ReferenceError: Cannot access 'wechatifyUserModuleMixin' before initialization
 *   at file:///home/huan/git/wechaty/wechaty/src/wechaty/wechaty-base.ts:58:3 *
 *
 * TODO: find out why
 */
import '../wechaty/wechaty-impl.js'

import {
  log,
}                       from '../config.js'

import {
  gErrorMixin,
}                             from '../wechaty-mixins/mod.js'

import {
  WechatySkeleton,
}                             from '../wechaty/wechaty-skeleton.js'

import {
  pluginMixin,
  PluginMixin,
  ProtectedPropertyPluginMixin,
}                                             from './plugin-mixin.js'

test('ProtectedPropertyPluginMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPluginMixin, keyof InstanceType<PluginMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('PluginMixin smoke testing', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const mixinBase = FP.pipe(
    WechatySkeleton,
    serviceCtlMixin('Wechaty', { log }),
    gErrorMixin,
    pluginMixin,
  )

  const sleep = () => new Promise(resolve => setTimeout(resolve, 10))

  class PluginMixinTest extends mixinBase {

    counter = 0
    override async onStart  ()  { await sleep() }
    override async onStop   ()  { await sleep() }

  }

  const Plugin = (wechaty: any) => {
    wechaty.counter++
    return () => wechaty.counter--
  }

  const pluginMixinTest = new PluginMixinTest()
  let future

  pluginMixinTest.use(Plugin)

  t.equal(pluginMixinTest.counter, 0, 'should not call plugin function before start')
  future = pluginMixinTest.start()
  t.equal(pluginMixinTest.counter, 0, 'should not call plugin function right after start')

  await sandbox.clock.runAllAsync()
  await future
  t.equal(pluginMixinTest.counter, 1, 'should call plugin function after start')

  future = pluginMixinTest.stop()
  await sandbox.clock.runAllAsync()
  await future
  t.equal(pluginMixinTest.counter, 0, 'should clean plugin context after stop')

  sandbox.restore()
})
