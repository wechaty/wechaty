#!/usr/bin/env ts-node

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
import test  from 'blue-tape'
import sinon from 'sinon'

import { PuppetMock } from 'wechaty-puppet-mock'

import {
  Wechaty,
}                             from './wechaty'
import { WechatyPlugin } from './plugin'

test('Wechaty Plugin uninstaller should be called after wechaty.stop()', async t => {
  const spyPluginInstall  = sinon.spy()
  const spyPluginUninstall = sinon.spy()

  const bot = new Wechaty({ puppet: new PuppetMock() })

  const plugin: WechatyPlugin = (_bot: Wechaty) => {
    spyPluginInstall()
    return () => {
      spyPluginUninstall()
    }
  }

  t.true(spyPluginInstall.notCalled, 'should be clean for install spy')
  t.true(spyPluginUninstall.notCalled, 'should be clean for uninstall spy')

  bot.use(plugin)
  t.true(spyPluginInstall.called, 'should called install spy after use()')
  t.true(spyPluginUninstall.notCalled, 'should not call uninstall spy after use()')

  await bot.start()
  await bot.stop()

  t.true(spyPluginUninstall.called, 'should called uninstall spy after stop()')
})
