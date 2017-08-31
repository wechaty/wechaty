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
import { test }   from 'ava'

import {
  Browser,
}                 from '../src/puppet-web/'

test('WebDriver smoke testing', async t => {
  try {
    const browser = new Browser()
    t.truthy(browser, 'Browser instnace')

    let pids = await browser.getBrowserPidList()
    t.is(pids.length, 0, 'should has no browser process before init()')

    await browser.driver.init()

    const driver = browser.driver.getWebDriver() // for help function `execute`
    t.truthy(driver, 'should get webdriver instance')

    await driver.get('https://wx.qq.com/')
    t.pass('should open wx.qq.com')

    pids = await browser.getBrowserPidList()
    t.truthy(pids.length > 0, 'should exist browser process after get()')

    await browser.driver.quit()

    pids = await browser.getBrowserPidList()
    t.is(pids.length, 0, 'should exist browser process after get()')
  } catch (e) {
    t.fail(e && e.message || e)
  }
})
