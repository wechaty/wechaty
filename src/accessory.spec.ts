#!/usr/bin/env ts-node
/**
 *   Wechaty - https://github.com/wechaty/wechaty
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
// tslint:disable:max-classes-per-file

import test  from 'blue-tape'
// import sinon from 'sinon'

import {
  cloneClass,
}               from 'clone-class'

import {
  Accessory,
}                       from './accessory'

import { Puppet }       from 'wechaty-puppet'

const EXPECTED_PUPPET1 = { p: 1 } as any as Puppet
const EXPECTED_PUPPET2 = { p: 2 } as any as Puppet

test('Accessory smoke testing', async t => {

  class FixtureClass extends Accessory {}

  t.throws(() => FixtureClass.puppet, 'should throw if read static puppet before initialize')

  const c = new FixtureClass()
  t.throws(() => c.puppet, 'should throw if read instance puppet before initialization')

  FixtureClass.puppet = EXPECTED_PUPPET1
  t.equal(FixtureClass.puppet,  EXPECTED_PUPPET1, 'should get EXPECTED_PUPPET1 from static puppet after set static puppet')
  t.equal(c.puppet,             EXPECTED_PUPPET1, 'should get EXPECTED_PUPPET1 from instance puppet after set static puppet')

  // c.puppet = EXPECTED_PUPPET2
  // t.equal(FixtureClass.puppet,  EXPECTED_PUPPET1, 'should get EXPECTED_PUPPET1 from static puppet after set instance puppet to EXPECTED_PUPPET2')
  // t.equal(c.puppet,             EXPECTED_PUPPET2, 'should get EXPECTED_PUPPET2 from instance puppet after set instance puppet to EXPECTED_PUPPET2')
})

test('Two clone-ed classes have different static puppet value', async t => {

  class FixtureClass extends Accessory {}

  // tslint:disable-next-line:variable-name
  const ClonedClass1 = cloneClass(FixtureClass)
  // tslint:disable-next-line:variable-name
  const ClonedClass2 = cloneClass(FixtureClass)

  ClonedClass1.puppet = EXPECTED_PUPPET1
  ClonedClass2.puppet = EXPECTED_PUPPET2

  const c1 = new ClonedClass1()
  const c2 = new ClonedClass2()

  t.equal(c1.puppet, EXPECTED_PUPPET1, 'should get the puppet as 1 from 1st cloned class')
  t.equal(c2.puppet, EXPECTED_PUPPET2, 'should get the puppet as 2 from 2nd cloned class')
})

test('Throw error when set the value again', async t => {
  class FixtureClass extends Accessory {}

  const fixture = new FixtureClass()

  t.doesNotThrow(() => { fixture.puppet = {} as any },  'instance: should not throw when set at 1st time')
  t.throws(() => { fixture.puppet = {} as any },        'instance: should throw when set at 2nd time')

  t.doesNotThrow(() => { FixtureClass.puppet = {} as any },  'static: should not throw when set at 1st time')
  t.throws(() => { FixtureClass.puppet = {} as any },        'static: should throw when set at 2nd time')
})
