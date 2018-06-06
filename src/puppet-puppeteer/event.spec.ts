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
import test  from 'blue-tape'
// tslint:disable:no-shadowed-variable
// import sinon from 'sinon'

import {
  MemoryCard,
}               from 'memory-card'

// import Wechaty  from '../wechaty'

import {
  // Event,
  PuppetPuppeteer,
}                   from './puppet-puppeteer'

test('Puppet Puppeteer Event smoke testing', async t => {
  const puppet = new PuppetPuppeteer({
    memory: new MemoryCard(),
  })

  try {
    await puppet.start()
    t.pass('should be inited')
    await puppet.stop()
    t.pass('should be quited')
  } catch (e) {
    t.fail('exception: ' + e.message)
  }
})
