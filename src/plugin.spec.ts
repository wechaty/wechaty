#!/usr/bin/env node
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
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { PuppetMock } from 'wechaty-puppet-mock'

import type { Wechaty } from './mods/mod.ts'
import { WechatyBuilder } from './wechaty-builder.ts'

import {
  type WechatyPlugin,
  isWechatyPluginUninstaller,
}                               from './plugin.ts'

/**
 *
 * Huan(202111): we are not remove plugins in the `stop()` method.
 *  @see https://github.com/wechaty/wechaty/issues/2282#issuecomment-966008175
 *
 * TODO: make sure to not remove or remote, then remove this comment
 *
 */
test('Wechaty Plugin uninstaller should be called after wechaty.stop()', async t => {
  const spyPluginInstall    = t.mock.fn()
  const spyPluginUninstall  = t.mock.fn()

  const bot = WechatyBuilder.build({ puppet: new PuppetMock() })
  let started = false
  t.after(async () => {
    if (started) {
      await bot.stop()
    }
  })

  const plugin: WechatyPlugin = (_bot: Wechaty) => {
    spyPluginInstall()
    return () => {
      spyPluginUninstall()
    }
  }

  assert.equal(spyPluginInstall.mock.callCount(), 0, 'should be clean for install spy')
  assert.equal(spyPluginUninstall.mock.callCount(), 0, 'should be clean for uninstall spy')

  const uninstaller = bot.use(plugin)
  assert.equal(spyPluginInstall.mock.callCount(), 1, 'should called install spy right after use() before start()')
  assert.equal(spyPluginUninstall.mock.callCount(), 0, 'should not call uninstall spy after use()')

  started = true
  await bot.start()
  assert.equal(spyPluginInstall.mock.callCount(), 1, 'should called install spy after start()')
  assert.equal(spyPluginUninstall.mock.callCount(), 0, 'should not call uninstall spy after start()')

  spyPluginInstall.mock.resetCalls()
  await bot.stop()
  started = false
  assert.equal(spyPluginInstall.mock.callCount(), 0, 'should not called with stop()')
  await new Promise(setImmediate) // clean the event loop
  assert.equal(spyPluginUninstall.mock.callCount(), 0, 'should not call uninstall spy after stop()')

  uninstaller()
  assert.equal(spyPluginUninstall.mock.callCount(), 1, 'should called uninstall spy after call uninstaller()')
})

test('isWechatyPluginUninstaller()', async _t => {
  const FIXTURES = [
    [ undefined, false ],
    [ () => {}, true ],
  ] as const

  for (const [ uninstaller, expected ] of FIXTURES) {
    assert.equal(isWechatyPluginUninstaller(uninstaller), expected, `isWechatyPluginUninstaller(${uninstaller}) === ${expected}`)
  }
})
