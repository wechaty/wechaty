/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
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
import { test } from 'ava'

import {
  Event,
  PuppetWeb,
} from '../../src/puppet-web/'

// const PORT = process.env.WECHATY_PORT || 58788
const PROFILE = 'unit-test-session.wechaty.json'

test('Puppet Web Event smoke testing', async t => {
  const pw = new PuppetWeb({profile: PROFILE})
  t.truthy(pw, 'should instantiated a PuppetWeb')

  try {
    await pw.init()
    t.pass('should be inited')

    await Event.onBrowserDead.call(pw, 'event unit test')
    t.pass('should finish onBrowserDead event process')

    await pw.quit()
  } catch (e) {
    t.fail('exception: ' + e.message)
  }
})
