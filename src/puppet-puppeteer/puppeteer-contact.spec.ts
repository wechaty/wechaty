#!/usr/bin/env ts-node

/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'
import * as sinon from 'sinon'

import cloneClass from 'clone-class'

import {
  log,
}              from '../config'
import Profile from '../profile'
import Wechaty from '../wechaty'

import Contact from '../contact'

import PuppetPuppeteer  from './puppet-puppeteer'

test('Contact smoke testing', async t => {

  /* tslint:disable:variable-name */
  const UserName = '@0bb3e4dd746fdbd4a80546aef66f4085'
  const NickName = 'NickNameTest'
  const RemarkName = 'AliasTest'

  const sandbox = sinon.createSandbox()

  function mockContactPayload(contact: Contact) {
    log.verbose('PuppeteerContactTest', 'mockContactPayload(%s)', contact.id)
    return new Promise<any>(resolve => {
      if (contact.id !== UserName) return resolve({})
      setImmediate(() => resolve({
        UserName:   UserName,
        NickName:   NickName,
        RemarkName: RemarkName,
      }))
    })
  }

  const puppet = new PuppetPuppeteer({
    profile: new Profile(),
    wechaty: new Wechaty(),
  })
  sandbox.stub(puppet as any, 'contactRawPayload').callsFake(mockContactPayload)

  // tslint:disable-next-line:variable-name
  const MyContact = cloneClass(Contact)
  MyContact.puppet = puppet

  const c = new MyContact(UserName)
  t.is(c.id, UserName, 'id/UserName right')

  await c.ready()

  t.is(c.name(), NickName, 'NickName set')
  t.is(c.alias(), RemarkName, 'should get the right alias from Contact')

  sandbox.restore()

  // const contact1 = await Contact.find({name: 'NickNameTest'})
  // t.is(contact1.id, UserName, 'should find contact by name')

  // const contact2 = await Contact.find({alias: 'AliasTest'})
  // t.is(contact2.id, UserName, 'should find contact by alias')
})
