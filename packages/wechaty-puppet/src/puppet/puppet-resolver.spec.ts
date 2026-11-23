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

import './interface-of.js'

import {
  resolvePuppet,
  resolvePuppetName,
}                     from './puppet-resolver.js'

test('resolvePuppet() for supported/unsupported name', async t => {
  await t.rejects(()  =>  resolvePuppet({ puppet: 'fadfdsafa' as any }), 'reject when options.puppet is unknown')
  await t.resolves(() =>  resolvePuppet({ puppet: 'yocto-queue' as any }), 'should resolve a valid npm package as puppet name')
})

test('resolvePuppetName() for ESM', async t => {
  const PuppetConstructor = await resolvePuppetName('yocto-queue' as any)
  t.equal(typeof PuppetConstructor, 'function', 'should get the puppet class function')
  t.equal(PuppetConstructor.name, 'Queue', 'should return a valid puppet name')
})

test('resolvePuppetName() for CJS', async t => {
  const PuppetConstructor = await resolvePuppetName('nop' as any)
  t.equal(typeof PuppetConstructor, 'function', 'should get the puppet class function')
  t.ok(PuppetConstructor.name === 'nop', 'should return a valid puppet name')
})
