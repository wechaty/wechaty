#!/usr/bin/env ts-node

/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
// import * as sinon from 'sinon'

import config     from '../src/config'
import Contact    from '../src/contact'
import Profile    from '../src/profile'
import PuppetWeb  from '../src/puppet-web'

config.puppetInstance(new PuppetWeb({
  profile: new Profile(),
}))

test('Contact smoke testing', async t => {
  /* tslint:disable:variable-name */
  const UserName = '@0bb3e4dd746fdbd4a80546aef66f4085'
  const NickName = 'NickNameTest'
  const RemarkName = 'AliasTest'

  // Mock
  const mockContactGetter = function (id) {
    return new Promise<any>((resolve, reject) => {
      if (id !== UserName) return resolve({});
      setTimeout(() => {
        return resolve({
          UserName: UserName,
          NickName: NickName,
          RemarkName: RemarkName,
        })
      }, 200)
    })
  }

  const c = new Contact(UserName)

  t.is(c.id, UserName, 'id/UserName right')
  const r = await c.ready(mockContactGetter)
  t.is(r.get('id')   , UserName, 'UserName set')
  t.is(r.get('name') , NickName, 'NickName set')
  t.is(r.name(), NickName, 'should get the right name from Contact')
  t.is(r.alias(), RemarkName, 'should get the right alias from Contact')

  const s = r.toString()
  t.is(typeof s, 'string', 'toString()')

  // const contact1 = await Contact.find({name: 'NickNameTest'})
  // t.is(contact1.id, UserName, 'should find contact by name')

  // const contact2 = await Contact.find({alias: 'AliasTest'})
  // t.is(contact2.id, UserName, 'should find contact by alias')
})
