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
// import * as sinon from 'sinon'

import PuppetAccessory  from './puppet-accessory'

import { Puppet }       from './puppet/'

const EXPECTED_PUPPET1 = {p: 1} as any as Puppet
const EXPECTED_PUPPET2 = {p: 2} as any as Puppet

test('PuppetAccessory smoke testing', async t => {
  class FixtureClass extends PuppetAccessory {}
  t.throws(() => FixtureClass.puppet, 'should throw if read static puppet before initialize')

  const c = new FixtureClass()
  t.throws(() => c.puppet, 'should throw if read instance puppet before initialization')

  FixtureClass.puppet = EXPECTED_PUPPET1
  t.equal(FixtureClass.puppet,  EXPECTED_PUPPET1, 'should get EXPECTED_PUPPET1 from static puppet after set static puppet')
  t.equal(c.puppet,             EXPECTED_PUPPET1, 'should get EXPECTED_PUPPET1 from instance puppet after set static puppet')

  c.puppet = EXPECTED_PUPPET2
  t.equal(FixtureClass.puppet,  EXPECTED_PUPPET1, 'should get EXPECTED_PUPPET1 from static puppet after set instance puppet to EXPECTED_PUPPET2')
  t.equal(c.puppet,             EXPECTED_PUPPET2, 'should get EXPECTED_PUPPET2 from instance puppet after set instance puppet to EXPECTED_PUPPET2')
})
