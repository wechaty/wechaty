#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import {
  test,
  sinon,
}           from 'tstest'

import { PuppetMock } from 'wechaty-puppet-mock'

import type { Wechaty } from './mods/mod.js'
import { WechatyBuilder } from './wechaty-builder.js'

import {
  WechatyPlugin,
  isWechatyPluginUninstaller,
}                               from './plugin.js'

/**
 *
 * Huan(202111): we are not remove plugins in the `stop()` method.
 *  @see https://github.com/wechaty/wechaty/issues/2282#issuecomment-966008175
 *
 * TODO: make sure to not remove or remote, then remove this comment
 *
 */
test('Wechaty Plugin uninstaller should be called after wechaty.stop()', async t => {
  const spyPluginInstall    = sinon.spy()
  const spyPluginUninstall  = sinon.spy()

  const bot = WechatyBuilder.build({ puppet: new PuppetMock() })

  const plugin: WechatyPlugin = (_bot: Wechaty) => {
    spyPluginInstall()
    return () => {
      spyPluginUninstall()
    }
  }

  t.ok(spyPluginInstall.notCalled, 'should be clean for install spy')
  t.ok(spyPluginUninstall.notCalled, 'should be clean for uninstall spy')

  const uninstaller = bot.use(plugin)
  t.ok(spyPluginInstall.calledOnce, 'should called install spy right after use() before start()')
  t.ok(spyPluginUninstall.notCalled, 'should not call uninstall spy after use()')

  await bot.start()
  t.ok(spyPluginInstall.calledOnce, 'should called install spy after start()')
  t.ok(spyPluginUninstall.notCalled, 'should not call uninstall spy after start()')

  spyPluginInstall.resetHistory()
  await bot.stop()
  t.ok(spyPluginInstall.notCalled, 'should not called with stop()')
  await new Promise(setImmediate) // clean the event loop
  t.ok(spyPluginUninstall.notCalled, 'should not call uninstall spy after stop()')

  uninstaller()
  t.ok(spyPluginUninstall.calledOnce, 'should called uninstall spy after call uninstaller()')
})

test('isWechatyPluginUninstaller()', async t => {
  const FIXTURES = [
    [undefined, false],
    [() => {}, true],
  ] as const

  for (const [uninstaller, expected] of FIXTURES) {
    t.equal(isWechatyPluginUninstaller(uninstaller), expected, `isWechatyPluginUninstaller(${uninstaller}) === ${expected}`)
  }
})
