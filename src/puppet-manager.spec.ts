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
import { test }  from 'tstest'
import type { PuppetModuleName } from './puppet-config.js'

import {
  PuppetManager,
}                 from './puppet-manager.js'

class PuppetManagerTest extends PuppetManager {

  static override resolveName (puppetName: PuppetModuleName) { return super.resolveName(puppetName) }

}

test('resolve an unsupported puppet name', async t => {
  await t.rejects(()  =>  PuppetManager.resolve({ puppet: 'fadfdsafa' as any }), 'reject when options.puppet is unknown')
  await t.resolves(() =>  PuppetManager.resolve({ puppet: 'wechaty-puppet-mock' }), 'should allow "wechaty-puppet-mock" as puppet name')
})

test('resolveName() for ESM', async t => {
  const PuppetImplementation = await PuppetManagerTest.resolveName('wechaty-puppet-mock')
  t.equal(typeof PuppetImplementation, 'function', 'should get the puppet class function')
  t.ok(PuppetImplementation.name === 'PuppetMock', 'should return a valid puppet name')
})

test('resolveName() for CJS', async t => {
  const PuppetImplementation = await PuppetManagerTest.resolveName('wechaty-puppet-padlocal')
  t.equal(typeof PuppetImplementation, 'function', 'should get the puppet class function')
  t.ok(PuppetImplementation.name === 'PuppetPadlocal', 'should return a valid puppet name')
})
