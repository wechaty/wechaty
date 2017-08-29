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
import { test }       from 'ava'

import config         from '../config'

import BrowserDriver  from './browser-driver'

/**
 * WHY force to use SERIAL mode
 *
 * serial here is because we are checking browser pids inside test.
 * if 2 tests run parallel in the same process,
 * there will have race conditions for the conflict of `getBrowserPids()`
 */
test.serial('BrowserDriver smoke testing', async t => {
  const browserDriver = new BrowserDriver(config.head)
  t.truthy(browserDriver, 'BrowserDriver instnace')

  await browserDriver.init()

  const driver = browserDriver.getWebDriver() // for help function `execute`
  t.truthy(driver, 'should get webdriver instance')

  await driver.get('https://wx.qq.com/')
  t.pass('should open wx.qq.com')

  const retAdd = await driverExecute('return 1+1')
  t.is(retAdd, 2, 'should return 2 for execute 1+1 in browser')

  await browserDriver.quit()

  return

  //////////////////////////////////
  function driverExecute(arg1: any, arg2?: any) {
    return driver.executeScript.apply(driver, arguments)
  }
})
