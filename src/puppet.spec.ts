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

import Profile    from './profile'
import PuppetWeb  from './puppet-web'

test('Puppet smoke testing', async t => {
  const profile = new Profile(Math.random().toString(36).substr(2, 5))
  const p = new PuppetWeb({ profile })

  t.ok(p.state.off(), 'should be OFF state after instanciate')
  p.state.on('pending')
  t.ok(p.state.on(), 'should be ON state after set')
  t.ok(p.state.pending(), 'should be pending state after set')
})
