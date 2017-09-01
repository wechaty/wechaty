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
import { test }       from 'ava'

import {
  config,
  log,
}                     from '../config'

import BrowserDriver  from './browser-driver'

test('BrowserDriver smoke testing', async t => {
  let err: Error = new Error('ttl timeout')
  let ttl = 3

  while (ttl--) {
    try {
      const browserDriver = new BrowserDriver(config.head)
      t.truthy(browserDriver, 'BrowserDriver instnace')

      await browserDriver.init()

      const driver = browserDriver.getWebDriver()
      t.truthy(driver, 'should get webdriver instance')

      await driver.get('https://mp.weixin.qq.com/')
      t.pass('should open mp.weixin.qq.com')

      const retAdd = await driver.executeScript<number>('return 1 + 1')
      t.is(retAdd, 2, 'should return 2 for execute 1+1 in browser')

      await browserDriver.close()
      await browserDriver.quit()

    } catch (e) {
      log.error('TestPuppetWebBrowserDriver', 'exception: %s', (e && e.message || e))
      err = e
    }
  }

  if (ttl <= 0) {
    t.fail('ttl timeout: ' + (err && err.message || err))
  }
})
