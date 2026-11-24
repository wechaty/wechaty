/** Native-runtime unit tests for loading installed ESM Puppet providers by name. */
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan Li <huan@chatie.io>, and
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
import assert from 'node:assert/strict'
import { test } from 'node:test'

import './interface-of.ts'

import {
  resolvePuppet,
  resolvePuppetName,
}                     from './puppet-resolver.ts'

test('resolvePuppet() for supported/unsupported name', async _t => {
  await assert.rejects(()  =>  resolvePuppet({ puppet: 'fadfdsafa' as any }), 'reject when options.puppet is unknown')
  await assert.doesNotReject(() =>  resolvePuppet({ puppet: 'yocto-queue' as any }), 'should resolve a valid npm package as puppet name')
})

test('resolvePuppetName() for ESM default constructor', async _t => {
  const PuppetConstructor = await resolvePuppetName('yocto-queue' as any)
  assert.equal(typeof PuppetConstructor, 'function', 'should get the puppet class function')
  assert.equal(PuppetConstructor.name, 'Queue', 'should return a valid puppet name')
})

test('resolvePuppetName() requires a direct default constructor', async () => {
  const source = encodeURIComponent('export default { default: class Puppet {} }')
  const specifier = `data:text/javascript,${source}` as Parameters<typeof resolvePuppetName>[0]

  await assert.rejects(() => resolvePuppetName(specifier), /has not provided a valid default export constructor/)
})

test('resolvePuppetName() rejects package without default function export', async _t => {
  await assert.rejects(
    () => resolvePuppetName('@chatie/semver' as any),
    /has not provided a valid default export constructor/,
    'should reject when package lacks default function export',
  )
})
