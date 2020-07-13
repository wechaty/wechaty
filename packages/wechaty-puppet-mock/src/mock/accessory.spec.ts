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
import { test } from 'tstest'

import { cloneClass } from 'clone-class'

import { AccessoryMock } from './accessory'
import { Mocker } from './mocker'

const EXPECTED_MOCKER1 = { m: 1 } as any as Mocker
const EXPECTED_MOCKER2 = { m: 2 } as any as Mocker

test('Accessory smoke testing', async t => {

  class FixtureClass extends AccessoryMock {}

  t.throws(() => FixtureClass.mocker, 'should throw if read static puppet before initialize')

  const c = new FixtureClass()
  t.throws(() => c.mocker, 'should throw if read instance puppet before initialization')

  FixtureClass.mocker = EXPECTED_MOCKER1
  t.equal(FixtureClass.mocker,  EXPECTED_MOCKER1, 'should get EXPECTED_MOCKER1 from static puppet after set static puppet')
  t.equal(c.mocker,             EXPECTED_MOCKER1, 'should get EXPECTED_MOCKER1 from instance puppet after set static puppet')

  // c.mocker = EXPECTED_MOCKER2
  // t.equal(FixtureClass.mocker,  EXPECTED_MOCKER1, 'should get EXPECTED_MOCKER1 from static puppet after set instance puppet to EXPECTED_MOCKER2')
  // t.equal(c.mocker,             EXPECTED_MOCKER2, 'should get EXPECTED_MOCKER2 from instance puppet after set instance puppet to EXPECTED_MOCKER2')
})

test('Two clone-ed classes have different static puppet value', async t => {

  class FixtureClass extends AccessoryMock {}

  const ClonedClass1 = cloneClass(FixtureClass)
  const ClonedClass2 = cloneClass(FixtureClass)

  ClonedClass1.mocker = EXPECTED_MOCKER1
  ClonedClass2.mocker = EXPECTED_MOCKER2

  const c1 = new ClonedClass1()
  const c2 = new ClonedClass2()

  t.equal(c1.mocker, EXPECTED_MOCKER1, 'should get the puppet as 1 from 1st cloned class')
  t.equal(c2.mocker, EXPECTED_MOCKER2, 'should get the puppet as 2 from 2nd cloned class')
})

test('Throw error when set the value again', async t => {
  class FixtureClass extends AccessoryMock {}

  t.doesNotThrow(() => { FixtureClass.mocker = {} as any },  'static: should not throw when set puppet at 1st time')
  t.throws(() => { FixtureClass.mocker = {} as any },        'static: should throw when set puppet at 2nd time')
})
