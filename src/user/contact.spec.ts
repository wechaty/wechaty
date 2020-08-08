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

import { ContactPayload } from 'wechaty-puppet'
import { PuppetMock } from 'wechaty-puppet-mock'

import { Wechaty }  from '../wechaty'

import { Contact }  from './contact'

test('findAll()', async t => {
  const EXPECTED_CONTACT_ID      = 'test-id'
  const EXPECTED_CONTACT_NAME    = 'test-name'
  const EXPECTED_CONTACT_ID_LIST = [EXPECTED_CONTACT_ID]

  const sandbox = sinon.createSandbox()

  const puppet = new PuppetMock()
  const wechaty = new Wechaty({ puppet })

  await wechaty.start()

  sandbox.stub(puppet, 'contactSearch').resolves(EXPECTED_CONTACT_ID_LIST)
  sandbox.stub(puppet, 'contactPayload').callsFake(async () => {
    await new Promise(resolve => setImmediate(resolve))
    return {
      name: EXPECTED_CONTACT_NAME,
    } as ContactPayload
  })

  const contactList = await wechaty.Contact.findAll()
  t.equal(contactList.length, 1, 'should find 1 contact')
  t.equal(contactList[0].name(), EXPECTED_CONTACT_NAME, 'should get name from payload')

  await wechaty.stop()
})

test('Should not be able to instanciate directly', async t => {
  t.throws(() => {
    const c = Contact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `Contact.load()`')

  t.throws(() => {
    const c = Contact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `Contact.load()`')
})

test('Should not be able to instanciate through cloneClass without puppet', async t => {
  t.throws(() => {
    const c = Contact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `MyContact.load()` without puppet')

  t.throws(() => {
    const c = Contact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `MyContact.load()` without puppet')

})

test('should throw when instanciate the global class', async t => {
  t.throws(() => {
    const c = Contact.load('xxx')
    t.fail('should not run to here')
    t.fail(c.toString())
  }, 'should throw when we instanciate a global class')
})
